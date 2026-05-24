# Orbit Backend

FastAPI service with MongoDB Atlas via Beanie.

## Quickstart

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `MONGODB_URI` in `.env` to your Atlas connection string, then:

```powershell
uvicorn app.main:app --reload
```

- Health: `GET http://localhost:8000/health`
- Webhook stub: `POST http://localhost:8000/api/webhook/whatsapp`
