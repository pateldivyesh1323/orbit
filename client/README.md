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

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui

## Project structure

```
src/
  app/              # routes and layouts
  components/ui/    # shadcn components
  lib/              # api client, utils
  types/            # shared TypeScript types
```
