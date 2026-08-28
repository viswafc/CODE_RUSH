"""CODE RUSH 2K26 — FastAPI Application Entry Point."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import engine, Base, get_db, SessionLocal
from app.models import *  # noqa: F401, F403 — ensures all models are imported
from app.models.admin import AdminUser
from app.models.competition import CompetitionConfig
from app.utils.security import hash_password

# Import routers
from app.routers import auth, rounds, leaderboard, admin
from app.routers.websocket import manager as ws_manager, admin_manager

settings = get_settings()

app = FastAPI(
    title="CODE RUSH 2K26",
    description="Live Coding Competition Platform — Coding Club Cyber Creepers, V.S.B. Engineering College",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(rounds.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)


# ---------------------------------------------------------------------------
# WebSocket endpoint for leaderboard
# ---------------------------------------------------------------------------

@app.websocket("/ws/leaderboard")
async def websocket_leaderboard(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial leaderboard
        db = SessionLocal()
        try:
            from app.services.leaderboard_service import get_leaderboard
            entries = get_leaderboard(db)
            await websocket.send_json({"type": "leaderboard_update", "data": entries})
        finally:
            db.close()

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.websocket("/ws/admin/status")
async def websocket_admin_status(websocket: WebSocket):
    await admin_manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            await admin_manager.broadcast_status_update(db)
        finally:
            db.close()

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        admin_manager.disconnect(websocket)
    except Exception:
        admin_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Server time endpoint
# ---------------------------------------------------------------------------

@app.get("/api/server-time")
def server_time():
    from datetime import datetime, timezone
    return {"server_time": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "CODE RUSH 2K26"}


# ---------------------------------------------------------------------------
# Startup — create tables, seed admin
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed admin user if not exists
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(
            AdminUser.username == settings.ADMIN_USERNAME
        ).first()
        if not existing:
            admin_user = AdminUser(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(admin_user)

        # Seed default competition config
        defaults = {
            "competition_status": "active",
            "registration_open": "true",
            "round1_duration": str(settings.ROUND1_DURATION_MINUTES),
            "round2_duration": str(settings.ROUND2_DURATION_MINUTES),
            "round2_points": str(settings.ROUND2_POINTS_PER_PROBLEM),
        }
        for key, value in defaults.items():
            existing_config = db.query(CompetitionConfig).filter(
                CompetitionConfig.key == key
            ).first()
            if not existing_config:
                db.add(CompetitionConfig(key=key, value=value))

        db.commit()
    finally:
        db.close()
