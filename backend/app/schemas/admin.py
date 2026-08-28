"""Pydantic schemas for admin operations."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AdminLogin(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CompetitionConfigUpdate(BaseModel):
    key: str
    value: str


class CompetitionStatusResponse(BaseModel):
    status: str  # "not_started", "active", "paused", "ended"
    registration_open: bool
    round1_duration_minutes: int
    round2_duration_minutes: int
    round2_points_per_problem: int
    total_students: int
    students_in_round1: int
    students_in_round2: int
    students_completed: int


class StudentAdminView(BaseModel):
    id: int
    register_number: str
    name: str
    department: str
    year: str
    state: str
    round1_score: int
    round1_time_seconds: Optional[int] = None
    round2_score: int
    round2_time_seconds: Optional[int] = None
    final_score: int
    total_time_seconds: int
    tab_switches: int = 0
    penalty_multiplier: float = 1.0
    disqualified: bool = False
    is_logged_in: bool = False
    last_active_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    department: str
    year: str
    current_round: str
    round1_score: int
    round1_time_seconds: Optional[int] = None
    round2_score: int
    round2_time_seconds: Optional[int] = None
    final_score: int
    total_time_seconds: int
    tab_switches: int = 0
    penalty_multiplier: float = 1.0


class LeaderboardAdminEntry(LeaderboardEntry):
    register_number: str
    state: str
    disqualified: bool = False
