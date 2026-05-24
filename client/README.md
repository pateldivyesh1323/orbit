# Orbit Client

Next.js dashboard for Orbit. Talks to the FastAPI server.

## Quickstart

```powershell
cd client
npm install
copy .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure the server is running at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Auth

- [http://localhost:3000/register](http://localhost:3000/register) — creates account via `POST /api/auth/register`
- [http://localhost:3000/login](http://localhost:3000/login) — signs in via `POST /api/auth/login`
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — loads `GET /api/auth/me` with stored JWT

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui

## Project structure

```
src/
  app/              # routes and layouts
  contexts/         # auth-context (AuthProvider, useAuth, useRequireAuth)
  components/ui/    # shadcn components
  lib/              # api client, utils
  types/            # shared TypeScript types
```

## Auth context

Wraps the app in `layout.tsx` via `<Providers>`. Use `useAuth()` anywhere in client components:

- `user`, `token`, `isLoading`, `isAuthenticated`
- `login(email, password)`, `register(payload)`, `logout()`, `refreshUser()`

Protected pages: `useRequireAuth()` redirects to `/login` when unauthenticated.
