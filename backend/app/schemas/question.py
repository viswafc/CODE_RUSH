"""Pydantic schemas for questions and test cases."""

from pydantic import BaseModel, Field
from typing import Optional, List


# ---------------------------------------------------------------------------
# Test Case schemas
# ---------------------------------------------------------------------------

class TestCaseCreate(BaseModel):
    input_data: str = ""
    expected_output: str
    is_sample: bool = False
    is_hidden: bool = True
    order_index: int = 0


class TestCaseResponse(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool
    is_hidden: bool
    order_index: int

    model_config = {"from_attributes": True}


class TestCaseSample(BaseModel):
    """Only sample test cases visible to students."""
    input_data: str
    expected_output: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Question schemas
# ---------------------------------------------------------------------------

class QuestionCreate(BaseModel):
    round_number: int = Field(..., ge=1, le=2)
    title: str = Field(..., min_length=1, max_length=200)
    description: str

    # Round 1 fields
    buggy_code: Optional[str] = None
    language: Optional[str] = None
    expected_behavior: Optional[str] = None
    options: Optional[str] = None
    correct_option: Optional[str] = None

    # Round 2 fields
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None

    points: int = 1
    order_index: int = 0

    test_cases: List[TestCaseCreate] = []


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    buggy_code: Optional[str] = None
    language: Optional[str] = None
    expected_behavior: Optional[str] = None
    options: Optional[str] = None
    correct_option: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    points: Optional[int] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class QuestionResponse(BaseModel):
    id: int
    round_number: int
    title: str
    description: str
    buggy_code: Optional[str] = None
    language: Optional[str] = None
    expected_behavior: Optional[str] = None
    options: Optional[str] = None
    correct_option: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    points: int
    order_index: int
    is_active: bool
    test_cases: List[TestCaseResponse] = []

    model_config = {"from_attributes": True}


class QuestionStudentView(BaseModel):
    """Question data visible to students (no hidden test cases)."""
    id: int
    round_number: int
    title: str
    description: str
    buggy_code: Optional[str] = None
    language: Optional[str] = None
    expected_behavior: Optional[str] = None
    options: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    points: int
    order_index: int
    sample_test_cases: List[TestCaseSample] = []

    model_config = {"from_attributes": True}
