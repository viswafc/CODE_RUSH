"""Package init — import all models so SQLAlchemy discovers them."""

from app.models.student import Student
from app.models.admin import AdminUser
from app.models.question import Question, TestCase
from app.models.submission import Submission
from app.models.round_attempt import RoundAttempt
from app.models.competition import CompetitionConfig
from app.models.student_question_order import StudentQuestionOrder

__all__ = [
    "Student",
    "AdminUser",
    "Question",
    "TestCase",
    "Submission",
    "RoundAttempt",
    "CompetitionConfig",
    "StudentQuestionOrder",
]
