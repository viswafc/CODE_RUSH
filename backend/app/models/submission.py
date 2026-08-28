"""Submission model — stores every code submission."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    WRONG_ANSWER = "WRONG_ANSWER"
    COMPILATION_ERROR = "COMPILATION_ERROR"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    round_number = Column(Integer, nullable=False)

    language = Column(String(20), nullable=False)
    source_code = Column(Text, nullable=False)
    option_selected = Column(String(1), nullable=True) # A, B, C, or D for MCQ

    status = Column(
        SAEnum(SubmissionStatus),
        default=SubmissionStatus.PENDING,
        nullable=False,
    )
    test_cases_passed = Column(Integer, default=0)
    test_cases_total = Column(Integer, default=0)
    score = Column(Integer, default=0)

    # Execution details
    execution_time_ms = Column(Integer, nullable=True)
    error_output = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", back_populates="submissions")
    question = relationship("Question", back_populates="submissions")
