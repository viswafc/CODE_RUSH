"""Student question order model for shuffling."""

from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class StudentQuestionOrder(Base):
    __tablename__ = "student_question_orders"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    round_number = Column(Integer, nullable=False)  # 1 or 2
    question_order = Column(Text, nullable=False)  # JSON array of shuffled question IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
