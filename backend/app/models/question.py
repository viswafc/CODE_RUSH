"""Question and TestCase models."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, nullable=False, index=True)  # 1 or 2
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)

    # For Round 1 (debugging): the buggy code and language
    buggy_code = Column(Text, nullable=True)
    language = Column(String(20), nullable=True)  # Only for Round 1
    expected_behavior = Column(Text, nullable=True)
    
    # MCQ Fields for Round 1
    options = Column(Text, nullable=True) # JSON serialized options A, B, C, D
    correct_option = Column(String(1), nullable=True) # 'A', 'B', 'C', 'D'

    # For Round 2 (coding): full problem statement
    input_description = Column(Text, nullable=True)
    output_description = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)

    # Scoring
    points = Column(Integer, default=1)

    # Ordering
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    test_cases = relationship(
        "TestCase", back_populates="question", cascade="all, delete-orphan"
    )
    submissions = relationship("Submission", back_populates="question")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)

    input_data = Column(Text, nullable=False, default="")
    expected_output = Column(Text, nullable=False)

    is_sample = Column(Boolean, default=False)  # True = visible to students
    is_hidden = Column(Boolean, default=True)  # True = hidden test case
    order_index = Column(Integer, default=0)

    # Relationships
    question = relationship("Question", back_populates="test_cases")
