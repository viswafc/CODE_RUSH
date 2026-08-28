"""Authentication middleware — extracts student/admin from JWT."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.admin import AdminUser
from app.utils.security import decode_access_token

security = HTTPBearer()


async def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Student:
    """Dependency: returns the authenticated student or raises 401."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    student_id = payload.get("sub")
    token_type = payload.get("type")
    if student_id is None or token_type != "student":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    student = db.query(Student).filter(Student.id == int(student_id)).first()
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student not found",
        )

    # Verify single-session enforcement
    if student.active_session_token != credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired — you logged in from another device",
        )

    return student


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AdminUser:
    """Dependency: returns the authenticated admin or raises 401."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    admin_id = payload.get("sub")
    token_type = payload.get("type")
    if admin_id is None or token_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )

    admin = db.query(AdminUser).filter(AdminUser.id == int(admin_id)).first()
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found",
        )

    return admin
