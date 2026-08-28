# CODE RUSH 2K26 - How to Run

Follow these instructions to run the CODE RUSH 2K26 platform locally.

## Prerequisites
- Node.js (v18 or higher recommended)
- Python 3.10+ (or newer)

## 1. Running the Backend Server
The backend is built with FastAPI. It handles the database, API routes, and secure code execution.

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Make sure your Python virtual environment is activated. If you haven't created one, you can run `python -m venv .venv`. (In this project it is already setup).
   - **Windows:** `.\.venv\Scripts\activate`
   - **Mac/Linux:** `source .venv/bin/activate`
3. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will now be running at `http://localhost:8000`.*

> **Database Reset (Event Prep):** If you ever need to completely wipe the database for an event, delete the `backend/code_rush.db` file and run `python seed.py` to recreate the admin user and questions.

## 2. Running the Frontend Server
The frontend is built with React and Vite.

1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.

## 3. Important URLs & Credentials
- **Student Portal:** `http://localhost:5173`
- **Admin Dashboard:** `http://localhost:5173/admin/login`

**Default Admin Credentials:**
- **Username:** `admin`
- **Password:** `admin`
