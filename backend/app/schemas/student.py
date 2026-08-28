"""Pydantic schemas for student auth and profile."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class YearEnum(str, Enum):
    II_YEAR = "II Year"
    III_YEAR = "III Year"


class StudentRegister(BaseModel):
    register_number: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=50)
    year: YearEnum


class StudentLogin(BaseModel):
    register_number: str = Field(..., min_length=1, max_length=50)


class StudentResponse(BaseModel):
    id: int
    register_number: str
    name: str
    department: str
    year: str
    state: str
    round1_score: int
    round1_questions_solved: int
    round1_time_seconds: Optional[int] = None
    round2_unlocked: bool
    round2_score: int
    round2_time_seconds: Optional[int] = None
    final_score: int
    total_time_seconds: int
    tab_switches: int = 0
    penalty_multiplier: float = 1.0
    disqualified: bool = False
    is_logged_in: bool = False

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentResponse
