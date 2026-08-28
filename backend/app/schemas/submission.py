"""Pydantic schemas for submissions and code execution."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CodeRunRequest(BaseModel):
    source_code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    stdin: str = ""


class CodeRunResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    timed_out: bool = False
    error: Optional[str] = None


class SubmitCodeRequest(BaseModel):
    source_code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)

class SubmitMCQRequest(BaseModel):
    selected_option: str = Field(..., min_length=1, max_length=1)


class SubmissionResponse(BaseModel):
    id: int
    question_id: int
    round_number: int
    language: str
    status: str
    test_cases_passed: int
    test_cases_total: int
    score: int
    execution_time_ms: Optional[int] = None
    error_output: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class RoundStartResponse(BaseModel):
    round_number: int
    started_at: datetime
    ends_at: datetime
    server_time: datetime


class RoundStatusResponse(BaseModel):
    round_number: int
    is_active: bool
    started_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    server_time: datetime
    time_remaining_seconds: int
    is_completed: bool
    score: int


class RoundCompleteResponse(BaseModel):
    round_number: int
    score: int
    total_possible: int
    problems_solved: int
    total_problems: int
    time_taken_seconds: int
