"""Judge service — evaluates student code against test cases."""

from sqlalchemy.orm import Session

from app.models.question import Question, TestCase
from app.models.submission import Submission, SubmissionStatus
from app.code_runner.runner import run_code, ExecutionResult


def judge_submission(
    db: Session,
    submission: Submission,
    question: Question,
) -> Submission:
    """Run the submission's code against all test cases and update status/score."""
    test_cases = (
        db.query(TestCase)
        .filter(TestCase.question_id == question.id)
        .order_by(TestCase.order_index)
        .all()
    )

    if not test_cases:
        submission.status = SubmissionStatus.ACCEPTED
        submission.test_cases_passed = 0
        submission.test_cases_total = 0
        submission.score = question.points
        db.commit()
        return submission

    passed = 0
    total = len(test_cases)
    last_error = None

    for tc in test_cases:
        result: ExecutionResult = run_code(
            source_code=submission.source_code,
            language=submission.language,
            stdin=tc.input_data,
        )

        if result.error:
            if "Compilation Error" in result.error:
                submission.status = SubmissionStatus.COMPILATION_ERROR
                submission.error_output = result.stderr[:2000]
                submission.test_cases_passed = passed
                submission.test_cases_total = total
                submission.score = 0
                db.commit()
                return submission
            elif "Time Limit" in result.error:
                last_error = SubmissionStatus.TIME_LIMIT_EXCEEDED
                continue
            elif "Memory" in result.error:
                last_error = SubmissionStatus.MEMORY_LIMIT_EXCEEDED
                continue
            else:
                last_error = SubmissionStatus.RUNTIME_ERROR
                submission.error_output = result.error[:2000]
                continue

        if result.exit_code != 0:
            last_error = SubmissionStatus.RUNTIME_ERROR
            submission.error_output = result.stderr[:2000]
            continue

        # Compare output (strip trailing whitespace/newlines)
        actual = result.stdout.strip()
        expected = tc.expected_output.strip()

        if actual == expected:
            passed += 1
        else:
            last_error = SubmissionStatus.WRONG_ANSWER

    submission.test_cases_passed = passed
    submission.test_cases_total = total

    if passed == total:
        submission.status = SubmissionStatus.ACCEPTED
        submission.score = question.points
    else:
        submission.status = last_error or SubmissionStatus.WRONG_ANSWER
        submission.score = 0

    db.commit()
    return submission
