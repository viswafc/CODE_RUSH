"""Student model."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class StudentState(str, enum.Enum):
    REGISTERED = "REGISTERED"
    ROUND_1_AVAILABLE = "ROUND_1_AVAILABLE"
    ROUND_1_IN_PROGRESS = "ROUND_1_IN_PROGRESS"
    ROUND_1_COMPLETED = "ROUND_1_COMPLETED"
    ROUND_2_AVAILABLE = "ROUND_2_AVAILABLE"
    ROUND_2_IN_PROGRESS = "ROUND_2_IN_PROGRESS"
    ROUND_2_COMPLETED = "ROUND_2_COMPLETED"
    COMPETITION_COMPLETED = "COMPETITION_COMPLETED"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    register_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)
    year = Column(String(20), nullable=False)

    # State machine
    state = Column(
        SAEnum(StudentState),
        default=StudentState.REGISTERED,
        nullable=False,
    )

    # Session tracking
    active_session_token = Column(String(500), nullable=True)

    # Scores
    round1_score = Column(Integer, default=0)
    round1_questions_solved = Column(Integer, default=0)
    round1_time_seconds = Column(Integer, nullable=True)
    round2_unlocked = Column(Boolean, default=False)
    round2_score = Column(Integer, default=0)
    round2_time_seconds = Column(Integer, nullable=True)
    final_score = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)

    # Anti-cheat
    tab_switches = Column(Integer, default=0)
    penalty_multiplier = Column(Float, default=1.0)
    last_switch_time = Column(DateTime(timezone=True), nullable=True)
    disqualified = Column(Boolean, default=False)
    disqualification_reason = Column(String(500), nullable=True)

    # Session tracking
    is_logged_in = Column(Boolean, default=False)
    session_active = Column(Boolean, default=False)
    last_active_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    round_attempts = relationship("RoundAttempt", back_populates="student")
    submissions = relationship("Submission", back_populates="student")
