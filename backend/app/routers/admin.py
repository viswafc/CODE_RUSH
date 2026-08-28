"""Admin router — authentication, competition control, question CRUD, results."""

import csv
import io
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import AdminUser
from app.models.student import Student, StudentState
from app.models.question import Question, TestCase
from app.models.submission import Submission
from app.models.competition import CompetitionConfig
from app.models.round_attempt import RoundAttempt
from app.schemas.admin import (
    AdminLogin,
    AdminTokenResponse,
    CompetitionConfigUpdate,
    CompetitionStatusResponse,
    StudentAdminView,
)
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    TestCaseCreate,
    TestCaseResponse,
)
from app.utils.security import verify_password, create_access_token
from app.middleware.auth import get_current_admin
from app.services.leaderboard_service import get_leaderboard
from app.routers.websocket import manager as ws_manager
from datetime import timedelta

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Admin Auth
# ---------------------------------------------------------------------------

@router.post("/login", response_model=AdminTokenResponse)
def admin_login(data: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == data.username).first()
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )
    token = create_access_token({"sub": str(admin.id), "type": "admin"})
    return AdminTokenResponse(access_token=token)


# ---------------------------------------------------------------------------
# Competition Control
# ---------------------------------------------------------------------------

@router.get("/competition/status", response_model=CompetitionStatusResponse)
def competition_status(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    def get_config(key: str, default: str) -> str:
        c = db.query(CompetitionConfig).filter(CompetitionConfig.key == key).first()
        return c.value if c else default

    total = db.query(Student).count()
    in_r1 = db.query(Student).filter(
        Student.state == StudentState.ROUND_1_IN_PROGRESS
    ).count()
    in_r2 = db.query(Student).filter(
        Student.state == StudentState.ROUND_2_IN_PROGRESS
    ).count()
    completed = db.query(Student).filter(
        Student.state.in_({
            StudentState.COMPETITION_COMPLETED,
            StudentState.ROUND_2_COMPLETED,
        })
    ).count()

    return CompetitionStatusResponse(
        status=get_config("competition_status", "active"),
        registration_open=get_config("registration_open", "true") == "true",
        round1_duration_minutes=int(get_config("round1_duration", "15")),
        round2_duration_minutes=int(get_config("round2_duration", "30")),
        round2_points_per_problem=int(get_config("round2_points", "10")),
        total_students=total,
        students_in_round1=in_r1,
        students_in_round2=in_r2,
        students_completed=completed,
    )


@router.post("/competition/config")
def update_config(
    data: CompetitionConfigUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    config = (
        db.query(CompetitionConfig)
        .filter(CompetitionConfig.key == data.key)
        .first()
    )
    if config:
        config.value = data.value
    else:
        config = CompetitionConfig(key=data.key, value=data.value)
        db.add(config)
        
    # If duration changed, update active RoundAttempts
    if data.key in ("round1_duration", "round2_duration"):
        try:
            new_duration = int(data.value)
            round_num = 1 if data.key == "round1_duration" else 2
            
            active_attempts = (
                db.query(RoundAttempt)
                .filter(
                    RoundAttempt.round_number == round_num,
                    RoundAttempt.is_completed == False
                )
                .all()
            )
            
            for attempt in active_attempts:
                attempt.ends_at = attempt.started_at + timedelta(minutes=new_duration)
                
        except ValueError:
            pass  # Handle non-integer gracefully
            
    db.commit()
    
    # Broadcast configuration update
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_config_update({"key": data.key, "value": data.value}))
    except RuntimeError:
        pass
        
    return {"status": "ok", "key": data.key, "value": data.value}


# ---------------------------------------------------------------------------
# Student Management
# ---------------------------------------------------------------------------

@router.get("/students", response_model=list[StudentAdminView])
def list_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[str] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Student)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Student.name.ilike(term) | Student.register_number.ilike(term)
        )
    if department:
        query = query.filter(Student.department == department)
    if year:
        query = query.filter(Student.year == year)
    return [StudentAdminView.model_validate(s) for s in query.all()]


@router.get("/student-status")
def live_student_status(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Returns live snapshot of student presence."""
    from datetime import datetime, timezone
    
    students = db.query(Student).all()
    now = datetime.now(timezone.utc)
    
    # Mark stale students as offline (> 2 minutes)
    updated = False
    for s in students:
        if s.is_logged_in and s.last_active_at:
            last_active = s.last_active_at.replace(tzinfo=timezone.utc)
            if (now - last_active).total_seconds() > 120:
                s.is_logged_in = False
                updated = True
                
    if updated:
        db.commit()

    total = len(students)
    logged_in = [s for s in students if s.is_logged_in]
    logged_out = [s for s in students if not s.is_logged_in]
    
    return {
        "total_students": total,
        "logged_in": len(logged_in),
        "logged_out": len(logged_out),
        "online_students": [StudentAdminView.model_validate(s).model_dump() for s in logged_in],
        "offline_students": [StudentAdminView.model_validate(s).model_dump() for s in logged_out],
    }


# ---------------------------------------------------------------------------
# Question Management
# ---------------------------------------------------------------------------

@router.get("/questions", response_model=list[QuestionResponse])
def list_questions(
    round_number: Optional[int] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Question)
    if round_number:
        query = query.filter(Question.round_number == round_number)
    return [QuestionResponse.model_validate(q) for q in query.order_by(Question.order_index).all()]


@router.post("/questions", response_model=QuestionResponse, status_code=201)
def create_question(
    data: QuestionCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = Question(
        round_number=data.round_number,
        title=data.title,
        description=data.description,
        buggy_code=data.buggy_code,
        language=data.language,
        expected_behavior=data.expected_behavior,
        input_description=data.input_description,
        output_description=data.output_description,
        constraints=data.constraints,
        sample_input=data.sample_input,
        sample_output=data.sample_output,
        points=data.points,
        order_index=data.order_index,
    )
    db.add(q)
    db.flush()

    for tc_data in data.test_cases:
        tc = TestCase(
            question_id=q.id,
            input_data=tc_data.input_data,
            expected_output=tc_data.expected_output,
            is_sample=tc_data.is_sample,
            is_hidden=tc_data.is_hidden,
            order_index=tc_data.order_index,
        )
        db.add(tc)

    db.commit()
    db.refresh(q)
    return QuestionResponse.model_validate(q)


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    data: QuestionUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(q, key, value)

    db.commit()
    db.refresh(q)
    return QuestionResponse.model_validate(q)


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    db.delete(q)
    db.commit()
    return {"status": "deleted"}


# Test case CRUD
@router.post("/questions/{question_id}/test-cases", response_model=TestCaseResponse, status_code=201)
def add_test_case(
    question_id: int,
    data: TestCaseCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    tc = TestCase(
        question_id=question_id,
        input_data=data.input_data,
        expected_output=data.expected_output,
        is_sample=data.is_sample,
        is_hidden=data.is_hidden,
        order_index=data.order_index,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return TestCaseResponse.model_validate(tc)


@router.delete("/test-cases/{tc_id}")
def delete_test_case(
    tc_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")
    db.delete(tc)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Admin Leaderboard
# ---------------------------------------------------------------------------

@router.get("/leaderboard")
def admin_leaderboard(
    round_filter: Optional[str] = Query(None, alias="round"),
    department: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_leaderboard(
        db,
        round_filter=round_filter,
        department=department,
        year=year,
        search=search,
        include_register_number=True,
    )


# ---------------------------------------------------------------------------
# Results Export
# ---------------------------------------------------------------------------

@router.get("/results/export")
def export_results(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Export all results as CSV."""
    students = db.query(Student).order_by(Student.final_score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Name", "Register Number", "Department", "Year",
        "Round 1 Score", "Round 1 Time (s)",
        "Round 2 Score", "Round 2 Time (s)",
        "Final Score", "Total Time (s)", "State",
    ])

    for rank, s in enumerate(students, 1):
        writer.writerow([
            rank, s.name, s.register_number, s.department, s.year,
            s.round1_score, s.round1_time_seconds or 0,
            s.round2_score, s.round2_time_seconds or 0,
            s.final_score, s.total_time_seconds, s.state.value,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=code_rush_results.csv"},
    )


# ---------------------------------------------------------------------------
# Restart Event
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _BaseModel

class RestartEventRequest(_BaseModel):
    password: str

@router.post("/restart-event")
def restart_event(
    data: RestartEventRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Completely restart the competition event.
    Deletes ALL student data, submissions, round attempts, question orders,
    and competition config. Questions are preserved.
    Requires admin password re-confirmation.
    """
    from app.models.student_question_order import StudentQuestionOrder

    # Verify admin password
    if not verify_password(data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect admin password",
        )

    # Delete in correct order to respect foreign key constraints
    db.query(Submission).delete()
    db.query(RoundAttempt).delete()
    db.query(StudentQuestionOrder).delete()
    db.query(Student).delete()
    db.query(CompetitionConfig).delete()

    # Re-seed default config
    defaults = [
        CompetitionConfig(key="competition_status", value="active"),
        CompetitionConfig(key="registration_open", value="true"),
        CompetitionConfig(key="round1_duration", value="15"),
        CompetitionConfig(key="round2_duration", value="30"),
        CompetitionConfig(key="round2_points", value="10"),
    ]
    db.add_all(defaults)
    db.commit()

    # Broadcast updates via WebSocket
    try:
        import asyncio
        from app.routers.websocket import admin_manager
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_leaderboard_update(db))
            loop.create_task(admin_manager.broadcast_status_update(db))
    except RuntimeError:
        pass

    return {"status": "ok", "message": "Event has been completely restarted. All student data has been wiped."}

