# G.K. Tutorials Management System

Starter foundation for the public website and private admin application.

## Stack
- Frontend: React + Vite
- Backend: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy 2.x
- Migrations: Alembic
- Authentication: JWT + Argon2 password hashing

## Requirements
- Python 3.11+
- Node.js 20+
- Docker Desktop (recommended for local PostgreSQL)

## 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d db
```

## 2. Configure and start the backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`. Set a long random `SECRET_KEY` and the initial admin email/password.

Create the first admin user:

```bash
python -m app.seed_admin
```

Generate the first migration and apply it:

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Whenever we change SQLAlchemy models later, generate a new migration with `alembic revision --autogenerate -m "describe change"` and review the generated file before applying it.

Start the API:

```bash
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

The Vite development server proxies `/api` requests to FastAPI.

## Current scope

This is the foundation, not the complete business application. It includes:
- React public/admin route structure
- Admin login screen
- Protected dashboard shell
- FastAPI health and authentication endpoints
- PostgreSQL connection
- Initial User, AcademicSession and Student models
- Alembic migration setup

The student, enquiry, batch, fee, attendance and test workflows will be implemented in subsequent milestones.

## Offline strategy

The initial release is online-first. Later, we will add PWA installation, cached application assets, locally saved drafts and carefully controlled synchronization. Financial transactions will not be treated as safely completed until the server confirms them.

## Important before real use

- Change all example credentials and secrets.
- Use HTTPS in production.
- Configure automated encrypted database backups.
- Restrict admin access and protect student/parent information.
- Test Excel imports on a copy before importing live records.
