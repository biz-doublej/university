# CampusOps AI — Backend Quickstart

## Prerequisites
- Python 3.11
- Optional: Docker

## Install (local)
1. Create virtualenv and install deps
```
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```
2. Run API
```
make run
```

API will be available on http://localhost:8000 with docs at /docs.

## API Preview (MVP)
- POST `/v1/import/sections` — CSV upload validation
- POST `/v1/optimize` — submit optimization job
- GET  `/v1/optimize/{job_id}` — job status
- GET  `/v1/timetable/rooms?week=YYYY-WW` — timetable placeholder
- PATCH `/v1/assignments/{id}` — assignment update stub
- GET  `/v1/vacancy/heatmap?week=YYYY-WW` — vacancy heatmap stub
- POST `/v1/calendar/publish?room_id=` — share URL stub
- GET  `/healthz` — health check

## Multi‑tenancy
- Send header `X-Tenant-ID` in requests as needed. A default tenant named `demo` is created on startup.

## Next Steps
- Implement real DB migrations
- Flesh out ORM models and relationships
- Integrate OR‑Tools in optimizer service
- Add auth (OIDC) and RBAC
- Add Redis/RQ for background jobs
- Add CSV→DB ETL for courses/rooms/timeslots
