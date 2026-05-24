# Orbit Server

FastAPI service with MongoDB Atlas via Beanie.

## Quickstart

```powershell
cd server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

If `uvicorn` fails with a path under `backend\.venv`, the virtualenv was copied from the old folder name—delete `server\.venv` and run the commands above again.

Set `MONGODB_URI` in `.env` to your Atlas connection string, then:

```powershell
uvicorn app.main:app --reload
```

- Health: `GET http://localhost:8000/health`
- Webhook stub: `POST http://localhost:8000/api/webhook/whatsapp`
- Register: `POST http://localhost:8000/api/auth/register` (JSON body)
- Login: `POST http://localhost:8000/api/auth/login` (form: `username`=email, `password`)
- Profile (auth required): `GET http://localhost:8000/api/users/me`
- Long-term context (auth required): `GET/POST/PATCH/DELETE http://localhost:8000/api/context`

Set `JWT_SECRET_KEY` in `.env` to a long random string before using auth endpoints.
