"""Rounds router — start round, get questions, submit code, finish round."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student, StudentState
from app.models.question import Question, TestCase
from app.models.submission import Submission, SubmissionStatus
from app.models.round_attempt import RoundAttempt
from app.schemas.submission import (
    SubmitCodeRequest,
    SubmitMCQRequest,
    SubmissionResponse,
    RoundStartResponse,
    RoundStatusResponse,
    RoundCompleteResponse,
    CodeRunRequest,
    CodeRunResponse,
)
from app.schemas.question import QuestionStudentView, TestCaseSample
from app.middleware.auth import get_current_student
from app.utils.state_machine import transition
from app.services.judge_service import judge_submission
from app.code_runner.runner import run_code
from app.config import get_settings
from app.routers.websocket import manager as ws_manager

router = APIRouter(prefix="/api/rounds", tags=["rounds"])
settings = get_settings()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_round_duration(db: Session, round_number: int) -> int:
    """Return round duration in minutes from DB."""
    from app.models.competition import CompetitionConfig
    key = "round1_duration" if round_number == 1 else "round2_duration"
    config = db.query(CompetitionConfig).filter(CompetitionConfig.key == key).first()
    if config:
        try:
            return int(config.value)
        except ValueError:
            pass
    
    if round_number == 1:
        return settings.ROUND1_DURATION_MINUTES
    return settings.ROUND2_DURATION_MINUTES


def _get_active_attempt(
    db: Session, student_id: int, round_number: int
) -> RoundAttempt | None:
    return (
        db.query(RoundAttempt)
        .filter(
            RoundAttempt.student_id == student_id,
            RoundAttempt.round_number == round_number,
        )
        .first()
    )


def _check_time_expired(attempt: RoundAttempt) -> bool:
    now = datetime.now(timezone.utc)
    return now >= attempt.ends_at.replace(tzinfo=timezone.utc)


def _complete_round(
    db: Session, student: Student, attempt: RoundAttempt, round_number: int
):
    """Finalize a round: calculate score, update student state."""
    now = datetime.now(timezone.utc)
    started = attempt.started_at.replace(tzinfo=timezone.utc)
    ended = min(now, attempt.ends_at.replace(tzinfo=timezone.utc))
    time_taken = int((ended - started).total_seconds())

    # Sum scores from accepted submissions
    accepted_submissions = (
        db.query(Submission)
        .filter(
            Submission.student_id == student.id,
            Submission.round_number == round_number,
            Submission.status == SubmissionStatus.ACCEPTED,
        )
        .all()
    )

    # Get unique accepted question IDs (best submission per question)
    accepted_question_ids = set()
    total_score = 0
    for sub in accepted_submissions:
        if sub.question_id not in accepted_question_ids:
            accepted_question_ids.add(sub.question_id)
            total_score += sub.score

    attempt.is_completed = True
    attempt.completed_at = now
    attempt.score = total_score
    attempt.time_taken_seconds = time_taken

    if round_number == 1:
        # For Round 1, the total score is stored in student.round1_score 
        # (It's already updated live on submission, but we'll recalculate here to be safe)
        student.round1_score = total_score
        student.round1_time_seconds = time_taken
        student.state = transition(student.state, StudentState.ROUND_1_COMPLETED)
        
        if student.round1_questions_solved >= 15:
            student.round2_unlocked = True
            student.state = transition(student.state, StudentState.ROUND_2_AVAILABLE)
            
    else:
        student.round2_score = total_score
        student.round2_time_seconds = time_taken
        student.state = transition(student.state, StudentState.ROUND_2_COMPLETED)
        student.state = transition(student.state, StudentState.COMPETITION_COMPLETED)

    student.final_score = int((student.round1_score + student.round2_score) * student.penalty_multiplier)
    student.total_time_seconds = (student.round1_time_seconds or 0) + (
        student.round2_time_seconds or 0
    )

    db.commit()

    # Broadcast leaderboard update via WebSocket
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_leaderboard_update(db))
    except RuntimeError:
        pass  # No event loop — happens in sync test contexts


# ---------------------------------------------------------------------------
# Start Round
# ---------------------------------------------------------------------------

@router.post("/{round_number}/start", response_model=RoundStartResponse)
def start_round(
    round_number: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if round_number not in (1, 2):
        raise HTTPException(400, "Invalid round number")
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    # Check if already started
    existing = _get_active_attempt(db, student.id, round_number)
    if existing:
        # Already started — return the existing attempt
        now = datetime.now(timezone.utc)
        ends_at = existing.ends_at.replace(tzinfo=timezone.utc)
        if now >= ends_at and not existing.is_completed:
            _complete_round(db, student, existing, round_number)
            raise HTTPException(400, f"Round {round_number} has already expired")
        if existing.is_completed:
            raise HTTPException(400, f"Round {round_number} already completed")
        return RoundStartResponse(
            round_number=round_number,
            started_at=existing.started_at,
            ends_at=existing.ends_at,
            server_time=now,
        )

    # Validate state transition
    target_state = (
        StudentState.ROUND_1_IN_PROGRESS
        if round_number == 1
        else StudentState.ROUND_2_IN_PROGRESS
    )

    try:
        student.state = transition(student.state, target_state)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot start Round {round_number} in current state: {student.state.value}",
        )

    now = datetime.now(timezone.utc)
    duration = _get_round_duration(db, round_number)
    ends_at = now + timedelta(minutes=duration)

    attempt = RoundAttempt(
        student_id=student.id,
        round_number=round_number,
        started_at=now,
        ends_at=ends_at,
    )
    db.add(attempt)
    db.commit()

    return RoundStartResponse(
        round_number=round_number,
        started_at=now,
        ends_at=ends_at,
        server_time=now,
    )


# ---------------------------------------------------------------------------
# Round Status
# ---------------------------------------------------------------------------

@router.get("/{round_number}/status", response_model=RoundStatusResponse)
def get_round_status(
    round_number: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if round_number not in (1, 2):
        raise HTTPException(400, "Invalid round number")
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    attempt = _get_active_attempt(db, student.id, round_number)
    now = datetime.now(timezone.utc)

    if not attempt:
        return RoundStatusResponse(
            round_number=round_number,
            is_active=False,
            server_time=now,
            time_remaining_seconds=_get_round_duration(db, round_number) * 60,
            is_completed=False,
            score=0,
        )

    ends_at = attempt.ends_at.replace(tzinfo=timezone.utc)
    remaining = max(0, int((ends_at - now).total_seconds()))

    # Auto-complete if expired
    if remaining == 0 and not attempt.is_completed:
        _complete_round(db, student, attempt, round_number)

    return RoundStatusResponse(
        round_number=round_number,
        is_active=not attempt.is_completed and remaining > 0,
        started_at=attempt.started_at,
        ends_at=attempt.ends_at,
        server_time=now,
        time_remaining_seconds=remaining,
        is_completed=attempt.is_completed,
        score=attempt.score,
    )


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@router.get("/config")
def get_rounds_config(db: Session = Depends(get_db)):
    """Get the current duration configs for rounds."""
    return {
        "round1_duration": _get_round_duration(db, 1),
        "round2_duration": _get_round_duration(db, 2),
    }


# ---------------------------------------------------------------------------
# Get Questions
# ---------------------------------------------------------------------------

@router.get("/{round_number}/questions", response_model=list[QuestionStudentView])
def get_questions(
    round_number: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if round_number not in (1, 2):
        raise HTTPException(400, "Invalid round number")

    # Verify student is in the correct state
    valid_states_r1 = {
        StudentState.ROUND_1_IN_PROGRESS,
        StudentState.ROUND_1_COMPLETED,
        StudentState.ROUND_2_AVAILABLE,
        StudentState.ROUND_2_IN_PROGRESS,
        StudentState.ROUND_2_COMPLETED,
        StudentState.COMPETITION_COMPLETED,
    }
    valid_states_r2 = {
        StudentState.ROUND_2_IN_PROGRESS,
        StudentState.ROUND_2_COMPLETED,
        StudentState.COMPETITION_COMPLETED,
    }
    valid_states = valid_states_r1 if round_number == 1 else valid_states_r2

    if student.state not in valid_states:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Round {round_number} is not accessible in your current state",
        )

    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    questions = (
        db.query(Question)
        .filter(Question.round_number == round_number, Question.is_active == True)
        .all()
    )
    
    # Question Shuffling Logic
    import random
    import json
    from app.models.student_question_order import StudentQuestionOrder
    
    order_record = (
        db.query(StudentQuestionOrder)
        .filter(
            StudentQuestionOrder.student_id == student.id,
            StudentQuestionOrder.round_number == round_number
        )
        .first()
    )
    
    if not order_record:
        q_ids = [q.id for q in questions]
        random.shuffle(q_ids)
        order_record = StudentQuestionOrder(
            student_id=student.id,
            round_number=round_number,
            question_order=json.dumps(q_ids)
        )
        db.add(order_record)
        db.commit()
        db.refresh(order_record)
        
    ordered_ids = json.loads(order_record.question_order)
    q_dict = {q.id: q for q in questions}
    # Create ordered list, filtering out any questions that might have been deleted
    ordered_questions = [q_dict[qid] for qid in ordered_ids if qid in q_dict]
    
    # Append any new questions that aren't in the saved order
    existing_ids = set(ordered_ids)
    for q in questions:
        if q.id not in existing_ids:
            ordered_questions.append(q)

    result = []
    for i, q in enumerate(ordered_questions):
        sample_cases = [
            TestCaseSample(input_data=tc.input_data, expected_output=tc.expected_output)
            for tc in q.test_cases
            if tc.is_sample
        ]
        view = QuestionStudentView(
            id=q.id,
            round_number=q.round_number,
            title=q.title,
            description=q.description,
            buggy_code=q.buggy_code,
            language=q.language,
            expected_behavior=q.expected_behavior,
            options=q.options,
            input_description=q.input_description,
            output_description=q.output_description,
            constraints=q.constraints,
            sample_input=q.sample_input,
            sample_output=q.sample_output,
            points=q.points,
            order_index=q.order_index,
            sample_test_cases=sample_cases,
        )
        result.append(view)

    return result


# ---------------------------------------------------------------------------
# Run Code (no judging — just execute with sample input)
# ---------------------------------------------------------------------------

@router.post("/{round_number}/run", response_model=CodeRunResponse)
def run_code_endpoint(
    round_number: int,
    data: CodeRunRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    # Verify round is active
    attempt = _get_active_attempt(db, student.id, round_number)
    if not attempt or attempt.is_completed:
        raise HTTPException(400, "Round is not active")
    if _check_time_expired(attempt):
        _complete_round(db, student, attempt, round_number)
        raise HTTPException(400, "Time has expired")

    result = run_code(
        source_code=data.source_code,
        language=data.language,
        stdin=data.stdin,
    )

    return CodeRunResponse(
        stdout=result.stdout[:5000],
        stderr=result.stderr[:5000],
        exit_code=result.exit_code,
        timed_out=result.timed_out,
        error=result.error,
    )


# ---------------------------------------------------------------------------
# Submit MCQ (Round 1)
# ---------------------------------------------------------------------------

@router.post(
    "/1/submit-mcq/{question_id}",
    response_model=SubmissionResponse,
)
def submit_mcq(
    question_id: int,
    data: SubmitMCQRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    # Verify round is active
    attempt = _get_active_attempt(db, student.id, 1)
    if not attempt or attempt.is_completed:
        raise HTTPException(400, "Round 1 is not active")
    if _check_time_expired(attempt):
        _complete_round(db, student, attempt, 1)
        raise HTTPException(400, "Time has expired — submissions locked")

    # Verify question exists and belongs to Round 1
    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.round_number == 1)
        .first()
    )
    if not question:
        raise HTTPException(404, "Question not found")

    # Check previous attempts to determine penalty or lock
    prev_submissions = (
        db.query(Submission)
        .filter(
            Submission.student_id == student.id,
            Submission.question_id == question_id,
            Submission.round_number == 1
        )
        .order_by(Submission.submitted_at.desc())
        .all()
    )

    # If they already attempted this question, don't let them submit again
    if len(prev_submissions) > 0:
        raise HTTPException(400, "You have already attempted this question")

    is_correct = data.selected_option.upper() == question.correct_option.upper()

    # Calculate score: +4 if correct, -1 if wrong
    earned_score = 4 if is_correct else -1

    submission = Submission(
        student_id=student.id,
        question_id=question_id,
        round_number=1,
        source_code="mcq",
        option_selected=data.selected_option.upper(),
        language="mcq",
        status=SubmissionStatus.ACCEPTED if is_correct else SubmissionStatus.WRONG_ANSWER,
        test_cases_passed=1 if is_correct else 0,
        test_cases_total=1,
        score=earned_score
    )
    db.add(submission)
    
    if is_correct:
        student.round1_questions_solved += 1
        
    student.round1_score = (student.round1_score or 0) + earned_score
    student.final_score = int(((student.round1_score or 0) + (student.round2_score or 0)) * student.penalty_multiplier)
        
    # Unlock Round 2 at 15
    if student.round1_questions_solved == 15 and not student.round2_unlocked:
        student.round2_unlocked = True

    db.commit()
    db.refresh(submission)
    
    # Broadcast leaderboard update via WebSocket
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_leaderboard_update(db))
    except RuntimeError:
        pass

    return SubmissionResponse.model_validate(submission)


# ---------------------------------------------------------------------------
# Submit Code (judged against hidden test cases) - For Round 2
# ---------------------------------------------------------------------------

@router.post(
    "/{round_number}/submit/{question_id}",
    response_model=SubmissionResponse,
)
def submit_code(
    round_number: int,
    question_id: int,
    data: SubmitCodeRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if round_number not in (1, 2):
        raise HTTPException(400, "Invalid round number")
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    # Verify round is active
    attempt = _get_active_attempt(db, student.id, round_number)
    if not attempt or attempt.is_completed:
        raise HTTPException(400, "Round is not active")
    if _check_time_expired(attempt):
        _complete_round(db, student, attempt, round_number)
        raise HTTPException(400, "Time has expired — submissions locked")

    # Verify question exists and belongs to this round
    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.round_number == round_number)
        .first()
    )
    if not question:
        raise HTTPException(404, "Question not found")

    # Create submission
    submission = Submission(
        student_id=student.id,
        question_id=question_id,
        round_number=round_number,
        language=data.language,
        source_code=data.source_code,
    )
    db.add(submission)
    db.flush()

    # Judge
    submission = judge_submission(db, submission, question)

    if submission.status == SubmissionStatus.ACCEPTED:
        # Check if they already solved it to prevent duplicate points
        already_solved = (
            db.query(Submission)
            .filter(
                Submission.student_id == student.id,
                Submission.question_id == question_id,
                Submission.status == SubmissionStatus.ACCEPTED,
                Submission.id != submission.id
            )
            .first()
        )
        if not already_solved:
            if round_number == 2:
                student.round2_score += submission.score
            else:
                student.round1_score += submission.score
            
            student.final_score = int(((student.round1_score or 0) + (student.round2_score or 0)) * student.penalty_multiplier)
            db.commit()

            # Broadcast leaderboard update via WebSocket
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(ws_manager.broadcast_leaderboard_update(db))
            except RuntimeError:
                pass

    return SubmissionResponse.model_validate(submission)


# ---------------------------------------------------------------------------
# Get Submissions for a Question
# ---------------------------------------------------------------------------

@router.get(
    "/{round_number}/submissions/{question_id}",
    response_model=list[SubmissionResponse],
)
def get_submissions(
    round_number: int,
    question_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    submissions = (
        db.query(Submission)
        .filter(
            Submission.student_id == student.id,
            Submission.question_id == question_id,
            Submission.round_number == round_number,
        )
        .order_by(Submission.submitted_at.desc())
        .all()
    )
    return [SubmissionResponse.model_validate(s) for s in submissions]


# ---------------------------------------------------------------------------
# Finish Round
# ---------------------------------------------------------------------------

@router.post("/{round_number}/finish", response_model=RoundCompleteResponse)
def finish_round(
    round_number: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if round_number not in (1, 2):
        raise HTTPException(400, "Invalid round number")
    if student.disqualified:
        raise HTTPException(403, "You have been disqualified. You can only view the leaderboard.")

    attempt = _get_active_attempt(db, student.id, round_number)
    if not attempt:
        raise HTTPException(400, f"Round {round_number} has not been started")
    if attempt.is_completed:
        raise HTTPException(400, f"Round {round_number} already completed")

    _complete_round(db, student, attempt, round_number)
    db.refresh(student)

    total_questions = (
        db.query(Question)
        .filter(Question.round_number == round_number, Question.is_active == True)
        .count()
    )

    # Count solved
    solved = (
        db.query(Submission.question_id)
        .filter(
            Submission.student_id == student.id,
            Submission.round_number == round_number,
            Submission.status == SubmissionStatus.ACCEPTED,
        )
        .distinct()
        .count()
    )

    score = student.round1_score if round_number == 1 else student.round2_score

    max_possible = 0
    questions = (
        db.query(Question)
        .filter(Question.round_number == round_number, Question.is_active == True)
        .all()
    )
    for q in questions:
        max_possible += q.points

    return RoundCompleteResponse(
        round_number=round_number,
        score=score,
        total_possible=max_possible,
        problems_solved=solved,
        total_problems=total_questions,
        time_taken_seconds=attempt.time_taken_seconds or 0,
    )
