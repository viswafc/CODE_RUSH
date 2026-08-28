# 🚀 Code Rush 2K26

**Code Rush 2K26** is a comprehensive, highly-secure coding competition platform. It is designed to handle multi-round programming competitions with an emphasis on performance, real-time leaderboards, automated secure code evaluation, and strict anti-cheat mechanisms.

![Code Rush Banner](https://via.placeholder.com/800x200.png?text=CODE+RUSH+2K26)

## 🏆 Features
- **Round 1 (Debugging & Logic):** 40 multiple-choice and debugging questions. A strict one-time submission system prevents second-guessing (+4 pts for correct, -1 pt penalty for incorrect). Fixed at 15 minutes.
- **Round 2 (Competitive Programming):** 10 complex algorithmic challenges with an integrated Monaco code editor. Securely compiles and executes user code in an isolated Docker-like sandbox for Python, Java, C, and C++. Fixed at 30 minutes.
- **Real-Time Leaderboard:** WebSocket-powered live ranking system updating scores instantly across all connected clients.
- **Advanced Anti-Cheat:** 
  - Dynamic question shuffling (no two students see the same question sequence).
  - Copy/paste restrictions and browser visibility tracking.
  - One-shot submissions in Round 1.
- **Admin Control Panel:** Complete authority to manage students, questions, round timing, and view underlying databases in real-time. Includes an emergency competition-reset switch.

## 🛠 Tech Stack
- **Frontend:** React (Vite), Context API, React-Router, Monaco Editor
- **Backend:** FastAPI (Python), WebSockets, Pydantic, SQLAlchemy
- **Database:** PostgreSQL (Hosted on Neon.tech)
- **Execution Engine:** Secure subprocess isolation with resource capping (memory & time limits).

---

## 💻 Local Development

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate | Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Deployment Guide

This project is configured to be deployed on modern serverless platforms.

### 1. Database (Neon)
Create a free PostgreSQL database on [Neon.tech](https://neon.tech/) and retrieve your `DATABASE_URL`.

### 2. Backend (Render.com)
1. Deploy the `backend/` directory as a Web Service.
2. Set `Build Command`: `pip install -r requirements.txt`
3. Set `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set the `DATABASE_URL` environment variable.

### 3. Frontend (Vercel)
1. Deploy the `frontend/` directory.
2. Set the Environment Variables:
   - `VITE_API_URL`: `<your-render-backend-url>/api`
   - `VITE_WS_URL`: `wss://<your-render-backend-url>/ws`

### 4. Database Seed
Once deployed, run `python seed.py` locally against your production database to create the default Admin account and populate the initial questions.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

---
*Built for Code Rush 2K26* 🚀
