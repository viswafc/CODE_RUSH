"""State machine for student competition progression.

Valid transitions:
    REGISTERED           → ROUND_1_AVAILABLE
    ROUND_1_AVAILABLE    → ROUND_1_IN_PROGRESS
    ROUND_1_IN_PROGRESS  → ROUND_1_COMPLETED
    ROUND_1_COMPLETED    → ROUND_2_AVAILABLE
    ROUND_2_AVAILABLE    → ROUND_2_IN_PROGRESS
    ROUND_2_IN_PROGRESS  → ROUND_2_COMPLETED
    ROUND_2_COMPLETED    → COMPETITION_COMPLETED

All other transitions are rejected.
"""

from app.models.student import StudentState

VALID_TRANSITIONS: dict[StudentState, set[StudentState]] = {
    StudentState.REGISTERED: {StudentState.ROUND_1_AVAILABLE},
    StudentState.ROUND_1_AVAILABLE: {StudentState.ROUND_1_IN_PROGRESS},
    StudentState.ROUND_1_IN_PROGRESS: {StudentState.ROUND_1_COMPLETED},
    StudentState.ROUND_1_COMPLETED: {StudentState.ROUND_2_AVAILABLE},
    StudentState.ROUND_2_AVAILABLE: {StudentState.ROUND_2_IN_PROGRESS},
    StudentState.ROUND_2_IN_PROGRESS: {StudentState.ROUND_2_COMPLETED},
    StudentState.ROUND_2_COMPLETED: {StudentState.COMPETITION_COMPLETED},
}


def can_transition(current: StudentState, target: StudentState) -> bool:
    """Return True if the transition from current to target is valid."""
    allowed = VALID_TRANSITIONS.get(current, set())
    return target in allowed


def transition(current: StudentState, target: StudentState) -> StudentState:
    """Attempt a state transition; raise ValueError if invalid."""
    if not can_transition(current, target):
        raise ValueError(
            f"Invalid state transition: {current.value} → {target.value}"
        )
    return target
