"""Leaderboard router — public and admin leaderboard views."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_student
from app.services.leaderboard_service import get_leaderboard

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(
    round_filter: Optional[str] = Query(None, alias="round"),
    department: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    student=Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get the public leaderboard (no register numbers)."""
    return get_leaderboard(
        db,
        round_filter=round_filter,
        department=department,
        year=year,
        search=search,
        include_register_number=False,
    )
