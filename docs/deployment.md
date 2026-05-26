# Deploying Orbit

This is the **Railway (backend) + Vercel (frontend)** path. The same pattern works on Render/Fly/VPS — substitute the backend host and adjust the start command.

You'll end up with two public URLs:

- Backend (Railway): `https://orbit-api-production.up.railway.app` (or your custom domain)
- Frontend (Vercel):  `https://orbit.vercel.app` (or your custom domain)

Set aside ~30 minutes the first time.

---

## 0. Prereqs

- Code pushed to a GitHub repo.
- MongoDB Atlas cluster already running (you have one for dev). In **Network Access** add `0.0.0.0/0` to the allowlist — Railway doesn't give you a static egress IP on hobby, so IP allowlisting won't work cleanly.
- All your dev `.env` values handy. You'll re-enter most of them, regenerate two of them.

---

## 1. Deploy the backend to Railway

### 1a. Create the service

1. https://railway.app → New Project → **Deploy from GitHub repo** → pick your repo.
2. After import, Railway will likely try to deploy the whole repo and fail (it'll see two roots — `server/` and `client/`).
3. Click the deployed service → **Settings → Root Directory** → set to `server`. Save and redeploy.
4. Railway auto-detects Python from `requirements.txt`. The start command comes from [server/Procfile](../server/Procfile): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### 1b. Set environment variables

Service → **Variables** tab → paste in:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=orbit

# Regenerate these for production — don't reuse dev keys:
JWT_SECRET_KEY=<openssl rand -hex 32>
INTEGRATION_ENCRYPTION_KEY=<python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
CRON_SECRET=<openssl rand -hex 32>

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_VALIDATE_SIGNATURES=true   # turn ON in prod

# Filled in after step 2:
FRONTEND_URL=https://orbit.vercel.app
CORS_ORIGINS=https://orbit.vercel.app

# Hardening:
ENABLE_DEV_ROUTES=false
ALLOW_REGISTRATION=true   # see step 5 — flip to false AFTER you create your account

# Scheduler — keep enabled for single instance:
BACKGROUND_SCHEDULER_ENABLED=true
SCHEDULER_SYNC_INTERVAL_MINUTES=60
SCHEDULER_NUDGE_INTERVAL_MINUTES=15

# Google Calendar OAuth — update redirect after Railway gives you a domain:
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://orbit-api-production.up.railway.app/api/integrations/oauth/google_calendar/callback

# Twilio webhook (set after Twilio update):
TWILIO_WEBHOOK_URL=https://orbit-api-production.up.railway.app/api/webhook/whatsapp
```

### 1c. Get the public URL

Service → **Settings → Networking → Generate Domain**. Copy the `https://...up.railway.app` URL. That's your backend.

### 1d. Verify

```bash
curl https://<your-backend>.up.railway.app/health
# → {"status":"ok","db":"reachable"}
```

If `/health` returns 500, check the Railway logs tab for missing env vars or the Mongo connection error.

---

## 2. Deploy the frontend to Vercel

1. https://vercel.com → Add New → **Project** → import the same GitHub repo.
2. **Root Directory** → set to `client`. Vercel auto-detects Next.js.
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app
   ```
4. Deploy. Vercel gives you `https://orbit-<hash>.vercel.app`.
5. (Optional) Vercel → Settings → Domains → add a custom domain like `orbit.example.com`.

### 2a. Backfill the backend with the frontend URL

Back in Railway → Variables, update:

```env
FRONTEND_URL=https://orbit.vercel.app
CORS_ORIGINS=https://orbit.vercel.app
```

Railway will redeploy automatically.

---

## 3. Re-wire external services

### 3a. Google Cloud Console

OAuth redirect URI changed from `localhost:8000` to your Railway domain.

1. https://console.cloud.google.com → your Orbit project → **APIs & Services → Credentials**.
2. Click your OAuth client → **Authorized redirect URIs** → add:
   ```
   https://<your-backend>.up.railway.app/api/integrations/oauth/google_calendar/callback
   ```
3. Keep the localhost one too if you still develop locally.
4. Make sure `GOOGLE_OAUTH_REDIRECT_URI` in Railway matches exactly (including `https://` and no trailing slash).

### 3b. Twilio WhatsApp webhook

1. https://console.twilio.com → Messaging → **Try it out → Send a WhatsApp message** (or your existing sandbox).
2. Under **Sandbox settings**, set:
   - **When a message comes in**: `https://<your-backend>.up.railway.app/api/webhook/whatsapp`
   - Method: `HTTP POST`
3. Save. Your sandbox now hits your prod backend.
4. Verify with a real WhatsApp message — should respond in 2–10 seconds. Check Railway logs if not.

### 3c. MongoDB Atlas

Network Access → confirm `0.0.0.0/0` is in the allowlist (or use a Railway private network — see "Hardening" below).

---

## 4. Verify end to end

| Check | How |
| --- | --- |
| Backend health | `curl https://<backend>/health` returns `ok` |
| Frontend loads | Open `https://<frontend>` → landing page → register or log in |
| Chat works | Send a message from the dashboard Chat tab |
| WhatsApp works | Text your sandbox number, get a reply |
| Calendar OAuth | Integrations → Connect with Google → redirects you back with green banner |
| Scheduler ticks | Watch Railway logs for `scheduler[integration_sync] running` after ~15s, then every hour |
| Memory write-back | Have a real conversation, check Memory tab for `source: ai_inferred` entries |

---

## 5. Production hardening checklist

- [x] `ENABLE_DEV_ROUTES=false` — kills `/api/dev/*` routes (force-fire nudge, context inspector, no-auth chat).
- [x] `TWILIO_VALIDATE_SIGNATURES=true` — drops any POST to `/api/webhook/whatsapp` that isn't signed by Twilio. Critical, otherwise anyone can spoof an inbound message.
- [x] Regenerated `JWT_SECRET_KEY`, `CRON_SECRET`, `INTEGRATION_ENCRYPTION_KEY`. **Do not** rotate `INTEGRATION_ENCRYPTION_KEY` after first deploy — encrypted integration tokens become unreadable.
- [x] **Lock down registration** — after you create your own account, set `ALLOW_REGISTRATION=false` in Railway and redeploy. The `/api/auth/register` endpoint will return 403 and the frontend will hide all Sign-up CTAs. Sign-in still works (you'll never be locked out of your own account). To re-open temporarily later (e.g. to invite a family member), flip back to `true`, register them, flip to `false`.
- [ ] (Later) Switch Atlas allowlist from `0.0.0.0/0` to Railway's private network — needs Railway Pro plan or a fixed egress proxy.
- [ ] (Later) Add a real custom domain on Vercel and Railway, update env vars + Google + Twilio.

---

## 6. Alternative: external cron instead of the in-process scheduler

The in-process scheduler is fine for a single-instance deployment (which is all of Orbit's current setup). If you scale to N instances, you'd get N copies of every sync and nudge tick — bad.

To switch to external cron:

1. Set `BACKGROUND_SCHEDULER_ENABLED=false` in Railway.
2. Pick a scheduler:
   - **Railway cron** — create a second Railway service with a `cronSchedule` in [railway.toml](../server/railway.toml) and a curl as the start command. See [context.md](../context.md) section on cron.
   - **GitHub Actions** — `.github/workflows/orbit-cron.yml` with `on: schedule: cron: "*/15 * * * *"`, curls `/api/cron/nudge`. Free, but fires 5–15 min late under load.
   - **cron-job.org** — free hosted HTTP cron, point at your endpoints.

In all three cases, the curl needs `Authorization: Bearer $CRON_SECRET`.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `503 INTEGRATION_ENCRYPTION_KEY is not configured` on Calendar connect | Env var not set on Railway | Add it, redeploy |
| CORS error in browser console | `CORS_ORIGINS` doesn't include the exact Vercel URL | Add the Vercel domain — must include `https://` |
| OAuth callback shows `error: redirect_uri_mismatch` | Google Cloud has the localhost URL only | Add the Railway URL in Google Cloud → Credentials |
| WhatsApp message goes to Twilio but Orbit never replies | Twilio sandbox webhook still pointing at ngrok / localhost | Update Twilio webhook to Railway URL |
| Scheduler logs nothing | `BACKGROUND_SCHEDULER_ENABLED=false` | Flip to `true`, redeploy |
| `Could not validate credentials` in browser after redeploy | JWT secret changed, existing tokens invalid | Log out and back in |
