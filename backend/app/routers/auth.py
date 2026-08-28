"""Authentication router — student register/login."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student, StudentState
from app.models.competition import CompetitionConfig
from app.schemas.student import (
    StudentRegister,
    StudentLogin,
    StudentResponse,
    TokenResponse,
)
from app.utils.security import create_access_token
from app.middleware.auth import get_current_student

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: StudentRegister, db: Session = Depends(get_db)):
    """Register a new student and return a JWT token."""
    # Check if registration is open
    reg_config = (
        db.query(CompetitionConfig)
        .filter(CompetitionConfig.key == "registration_open")
        .first()
    )
    if reg_config and reg_config.value == "false":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed",
        )

    # Check for duplicate register number
    existing = (
        db.query(Student)
        .filter(Student.register_number == data.register_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this register number already exists. Use login instead.",
        )

    student = Student(
        register_number=data.register_number,
        name=data.name,
        department=data.department,
        year=data.year.value,
        state=StudentState.ROUND_1_AVAILABLE,
    )
    db.add(student)
    db.flush()  # Get the ID

    token = create_access_token({"sub": str(student.id), "type": "student"})
    student.active_session_token = token
    student.is_logged_in = True
    student.session_active = True
    from datetime import datetime, timezone
    student.last_active_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(student)
    
    from app.routers.websocket import admin_manager
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(admin_manager.broadcast_status_update(db))
    except RuntimeError:
        pass

    return TokenResponse(
        access_token=token,
        student=StudentResponse.model_validate(student),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: StudentLogin, db: Session = Depends(get_db)):
    """Login with register number and return a new JWT token."""
    student = (
        db.query(Student)
        .filter(Student.register_number == data.register_number)
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student found with this register number. Please register first.",
        )

    # Issue a new token (invalidates old session — single session enforcement)
    token = create_access_token({"sub": str(student.id), "type": "student"})
    student.active_session_token = token
    student.is_logged_in = True
    student.session_active = True
    from datetime import datetime, timezone
    student.last_active_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(student)

    from app.routers.websocket import admin_manager
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(admin_manager.broadcast_status_update(db))
    except RuntimeError:
        pass

    return TokenResponse(
        access_token=token,
        student=StudentResponse.model_validate(student),
    )


@router.get("/me", response_model=StudentResponse)
def get_profile(student: Student = Depends(get_current_student)):
    """Get the current authenticated student's profile."""
    return StudentResponse.model_validate(student)


@router.post("/tab-switch", response_model=StudentResponse)
def register_tab_switch(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Register a tab switch for the student and apply penalty."""
    import datetime
    from app.routers.websocket import manager as ws_manager, admin_manager
    
    # Only penalize if they are actively in a round
    active_states = {StudentState.ROUND_1_IN_PROGRESS, StudentState.ROUND_2_IN_PROGRESS}
    if student.state not in active_states:
        return StudentResponse.model_validate(student)
        
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Backend debounce: ignore if last switch was less than 2 seconds ago
    if student.last_switch_time:
        diff = (now - student.last_switch_time.replace(tzinfo=datetime.timezone.utc)).total_seconds()
        if diff < 2.0:
            return StudentResponse.model_validate(student)
            
    student.tab_switches += 1
    student.last_switch_time = now
    
    # Calculate penalty
    switches = student.tab_switches
    if switches == 0:
        student.penalty_multiplier = 1.0
    elif switches <= 2:
        student.penalty_multiplier = 0.95
    elif switches <= 5:
        student.penalty_multiplier = 0.85
    elif switches <= 10:
        student.penalty_multiplier = 0.70
    else:
        student.penalty_multiplier = 0.50
        
    # Recalculate final score
    base_r1 = student.round1_score or 0
    base_r2 = student.round2_score or 0
    student.final_score = int((base_r1 + base_r2) * student.penalty_multiplier)
    
    # Auto-disqualification logic
    if student.tab_switches >= 5:
        student.disqualified = True
        student.disqualification_reason = "Exceeded maximum allowed tab switches (5)"
        student.is_logged_in = False
        student.session_active = False

    db.commit()
    db.refresh(student)
    
    # Broadcast updates
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast_leaderboard_update(db))
            loop.create_task(admin_manager.broadcast_status_update(db))
    except RuntimeError:
        pass
        
    return StudentResponse.model_validate(student)

@router.post("/heartbeat", response_model=StudentResponse)
def heartbeat(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Update last active timestamp for admin tracking."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    student.last_active_at = now
    if not student.is_logged_in and not student.disqualified:
        student.is_logged_in = True
        student.session_active = True
        
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student)
