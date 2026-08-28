"""Leaderboard service — calculates rankings and broadcasts updates."""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.models.student import Student, StudentState
from app.schemas.admin import LeaderboardEntry, LeaderboardAdminEntry


def get_leaderboard(
    db: Session,
    round_filter: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    include_register_number: bool = False,
) -> list[dict]:
    """Calculate the leaderboard with proper ranking.

    Ranking rules:
        1. Higher final_score = higher rank
        2. For tie-breaking: lower total_time_seconds = higher rank
    """
    query = db.query(Student)

    # Only include students who have started competing
    completed_states = {
        StudentState.ROUND_1_COMPLETED,
        StudentState.ROUND_2_AVAILABLE,
        StudentState.ROUND_2_IN_PROGRESS,
        StudentState.ROUND_2_COMPLETED,
        StudentState.COMPETITION_COMPLETED,
    }

    if round_filter == "round1":
        # Students who completed Round 1
        query = query.filter(Student.state.in_(completed_states))
    elif round_filter == "round2":
        # Students who completed Round 2
        query = query.filter(
            Student.state.in_({
                StudentState.ROUND_2_COMPLETED,
                StudentState.COMPETITION_COMPLETED,
            })
        )
    elif round_filter == "final":
        query = query.filter(
            Student.state.in_({
                StudentState.ROUND_2_COMPLETED,
                StudentState.COMPETITION_COMPLETED,
            })
        )
    else:
        # "all" — include anyone who has completed at least Round 1
        query = query.filter(Student.state.in_(
            completed_states | {StudentState.ROUND_1_IN_PROGRESS}
        ))

    # Filters
    if department:
        query = query.filter(Student.department == department)
    if year:
        query = query.filter(Student.year == year)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Student.name.ilike(search_term)
            | Student.register_number.ilike(search_term)
        )

    # Sort: score DESC, time ASC
    query = query.order_by(
        desc(Student.final_score),
        asc(Student.total_time_seconds),
    )

    students = query.all()

    entries = []
    for rank, student in enumerate(students, start=1):
        # Determine current round display
        state_display = {
            StudentState.ROUND_1_IN_PROGRESS: "Round 1",
            StudentState.ROUND_1_COMPLETED: "Round 1",
            StudentState.ROUND_2_AVAILABLE: "Round 1",
            StudentState.ROUND_2_IN_PROGRESS: "Round 2",
            StudentState.ROUND_2_COMPLETED: "Round 2",
            StudentState.COMPETITION_COMPLETED: "Completed",
        }.get(student.state, "—")

        entry = {
            "rank": rank,
            "name": student.name,
            "department": student.department,
            "year": student.year,
            "current_round": state_display,
            "round1_questions_solved": student.round1_questions_solved,
            "round1_score": student.round1_score,
            "round1_time_seconds": student.round1_time_seconds,
            "round2_score": student.round2_score,
            "round2_time_seconds": student.round2_time_seconds,
            "final_score": student.final_score,
            "total_time_seconds": student.total_time_seconds,
        }
        if include_register_number:
            entry["register_number"] = student.register_number
            entry["state"] = student.state.value

        entries.append(entry)

    return entries
