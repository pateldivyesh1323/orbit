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

Set `MONGODB_URI`, `JWT_SECRET_KEY`, and `GEMINI_API_KEY` in `.env`, then:

```powershell
uvicorn app.main:app --reload
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login (form: `username`=email) |
| `GET /api/users/me` | Profile (Bearer token) |
| `POST /api/dev/chat` | Test Gemini without WhatsApp (JSON) |
| `POST /api/webhook/whatsapp` | Twilio WhatsApp inbound webhook |

## Test AI locally (no WhatsApp)

```powershell
curl -X POST http://localhost:8000/api/dev/chat `
  -H "Content-Type: application/json" `
  -d "{\"message\": \"What should I focus on today?\"}"
```

Optional: pass `"whatsapp_number": "+14155552671"` to target a specific user.

## WhatsApp via Twilio

1. Create a [Twilio](https://www.twilio.com/) account and enable the **WhatsApp Sandbox** (or a WhatsApp sender).
2. Add to `.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886` from the sandbox)
3. Expose your server with [ngrok](https://ngrok.com/): `ngrok http 8000`
4. Set the Twilio sandbox **When a message comes in** webhook to:
   `https://YOUR-NGROK-URL/api/webhook/whatsapp` (HTTP POST)
5. Set `TWILIO_WEBHOOK_URL` to that same public URL (needed if `TWILIO_VALIDATE_SIGNATURES=true`).
6. Register in Orbit with your WhatsApp number (E.164, e.g. `+1...`) on the dashboard profile.
7. Send a WhatsApp message to the sandbox number.

Flow: inbound message → match user by `contact.whatsapp_number` → load profile + memory → Gemini → reply via Twilio REST API.
