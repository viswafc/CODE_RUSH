"""WebSocket manager for real-time leaderboard updates."""

import json
from typing import List
from fastapi import WebSocket
from sqlalchemy.orm import Session


class ConnectionManager:
    """Manages WebSocket connections and broadcasts leaderboard updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send message to all connected clients."""
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def broadcast_leaderboard_update(self, db: Session):
        """Recalculate leaderboard and broadcast to all clients."""
        from app.services.leaderboard_service import get_leaderboard

        entries = get_leaderboard(db)
        await self.broadcast({
            "type": "leaderboard_update",
            "data": entries,
        })
        
    async def broadcast_config_update(self, data: dict):
        """Broadcast configuration updates to all clients."""
        await self.broadcast({
            "type": "config_update",
            "data": data,
        })


class AdminConnectionManager:
    """Manages WebSocket connections for admin live status updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send message to all connected admins."""
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)
            
    async def broadcast_status_update(self, db: Session):
        """Broadcast live student statuses to admins."""
        from app.models.student import Student
        from app.schemas.admin import StudentAdminView
        
        # We could broadcast all students, but for live status let's just broadcast 
        # a lightweight summary or the whole list if requested
        students = db.query(Student).all()
        data = [StudentAdminView.model_validate(s).model_dump() for s in students]
        
        await self.broadcast({
            "type": "student_status_update",
            "data": data,
        })


# Global singletons
manager = ConnectionManager()
admin_manager = AdminConnectionManager()
