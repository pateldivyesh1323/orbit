# Google Calendar — One-time setup

Orbit reads your Google Calendar over OAuth 2.0. Because this is a self-hosted single-user app, you create your own Google Cloud project and OAuth client. This takes ~5 minutes.

## 1. Create a Google Cloud project

1. Go to https://console.cloud.google.com/.
2. Click the project dropdown → **New Project**. Name it anything (e.g. `orbit-personal`). Create.
3. Make sure the new project is selected in the top bar.

## 2. Enable the Google APIs you'll use

1. Left menu → **APIs & Services → Library**.
2. Search for **Google Calendar API** → click it → **Enable**.
3. (For the Gmail integration) search for **Gmail API** → **Enable**.

> Orbit's Google integrations (Calendar, Gmail) share **one** OAuth client and
> **one** redirect URI. The service being connected travels in a signed state
> parameter, so you don't register anything extra per service — just enable the
> API and connect from the dashboard. Gmail uses the read-only scope
> (`gmail.readonly`); in "Testing" mode your own account can grant it without
> Google verification.

## 3. Configure the OAuth consent screen

1. Left menu → **APIs & Services → OAuth consent screen**.
2. User type: **External** → Create.
3. App information:
   - App name: `Orbit` (or whatever you like)
   - User support email: your email
   - Developer contact: your email
4. **Scopes** screen → Save and Continue (don't add scopes here; Orbit requests them per session).
5. **Test users** → Add your own Google account. Save.
6. Publishing status stays in "Testing" — that's fine for personal use; "External + Testing" lets you use the app without verification, just yourself plus up to 100 test users.

## 4. Create the OAuth client

1. Left menu → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Orbit local` (or whatever).
5. **Authorized redirect URIs** → Add:
   ```
   http://localhost:8000/api/integrations/oauth/google_calendar/callback
   ```
   (For production, also add your deployed backend URL with the same path.)
6. Create. A modal pops up with the **Client ID** and **Client secret** — copy both.

## 5. Put them in `.env`

In `server/.env`:

```env
FRONTEND_URL=http://localhost:3000
GOOGLE_OAUTH_CLIENT_ID=<paste client id>
GOOGLE_OAUTH_CLIENT_SECRET=<paste client secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/integrations/oauth/google_calendar/callback
```

Restart `uvicorn`.

## 6. Connect from the dashboard

1. Open the dashboard → **Integrations**.
2. **Google Calendar** card → **Connect with Google**.
3. Sign in, accept the scopes (read-only calendar + email/openid for identity).
4. You'll bounce back to `/dashboard?integration=google_calendar&status=connected` with a success banner.
5. Click **Sync now** to pull today's + tomorrow's events.

## What Orbit reads

Scope: `https://www.googleapis.com/auth/calendar.readonly`. Orbit:

- Lists events from your **primary** calendar only (multi-calendar TBD).
- Looks at the current day and next day in your timezone.
- Stores nothing more than: event title, start/end, location (if set), all-day flag.
- Computes free blocks (gaps ≥30 min between 08:00–20:00 local).
- Does NOT read attendees, descriptions, attachments, or write anything.

Tokens are encrypted at rest with `INTEGRATION_ENCRYPTION_KEY` (Fernet). Disconnecting from the dashboard deletes the Integration document; revoke from Google's side at https://myaccount.google.com/permissions if you want belt-and-suspenders.

## Common errors after callback

| `detail=` | Meaning | Fix |
| --- | --- | --- |
| `no_refresh_token` | Google didn't send a refresh token | Revoke at myaccount.google.com/permissions, then reconnect — Google only issues refresh tokens on first consent or with `prompt=consent` (which Orbit always sends) |
| `token_exchange_failed` | Code → token swap returned 4xx/5xx | Check `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` match the OAuth client in Google Cloud |
| `Invalid or expired OAuth state` | Took >15 min between clicking Connect and finishing sign-in | Click Connect again |
| `user_not_found` | The JWT in state references a deleted/inactive user | Re-login on Orbit, then reconnect |
