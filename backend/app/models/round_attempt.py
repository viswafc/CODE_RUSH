"""RoundAttempt model — tracks when a student starts/ends a round."""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RoundAttempt(Base):
    __tablename__ = "round_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    round_number = Column(Integer, nullable=False)  # 1 or 2

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ends_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    is_completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="round_attempts")
