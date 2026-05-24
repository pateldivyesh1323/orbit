# Orbit — Project Context

## Role and Objective

Act as a **Senior Full-Stack Engineer** specializing in event-driven serverless architectures, AI agent workflows, and the MERN stack.

We are building a personal AI copilot named **"Orbit"** that runs 24/7 to monitor daily habits, work productivity, and health, actively guiding the user via WhatsApp.

**Goal:** A scalable, zero-maintenance prototype designed for self-hosting. It must be:

- Resilient against server cold starts
- Highly modular so new data connectors can be added easily

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Backend API | FastAPI (Python) — webhooks, cron, AI, DB |
| Frontend Dashboard | Next.js (App Router) — settings UI only, calls FastAPI |
| Backend Hosting | Railway, Render, Fly.io, or VPS (Python runtime; not Vercel) |
| Frontend Hosting | Vercel |
| Database | MongoDB Atlas (Beanie async ODM on Motor) |
| AI Engine | Gemini Free API (`google-genai` Python SDK) |
| Interface | Twilio API for WhatsApp (or Meta WhatsApp Cloud API) |
| UI Library | Tailwind CSS, Shadcn UI (for the settings dashboard) |

---

## System Architecture & Core Flows

### 1. The WhatsApp Webhook Loop (FastAPI Backend)

- An endpoint (`POST /api/webhook/whatsapp` on FastAPI) receives incoming messages.
- The handler instantly queries MongoDB to fetch the user's core profile, current context, and active integrations.
- The handler constructs a context-rich prompt and calls the Gemini API.
- The handler parses the Gemini response and dispatches a message back via Twilio/Meta API **before the webhook times out (must execute under 10–15 seconds)**.

### 2. The Integration Engine (Cron & Background Data)

- **Scheduled HTTP triggers** (Vercel Cron hitting FastAPI, or platform cron on Railway/Render) call endpoints (e.g., `/api/cron/sync`) at scheduled intervals to fetch external data:
  - Google Calendar events
  - GitHub commits
  - WakaTime stats
- This data is stored in the MongoDB `memory` or `context` collections to be injected into the next Gemini prompt.

### 3. The Web Dashboard (Next.js Frontend)

- A lightweight control panel to manage OAuth connections and API keys.
- Calls the FastAPI backend over HTTP.
- **Database schema requires strict separation:**
  - **`User`** — Core settings, high-level goals.
  - **`Integrations`** — Documents storing tokens and status (active/inactive) for GitHub, Google Calendar, etc.

---

## Implementation Phases (Step-by-Step Execution)

### Phase 1: Foundation & Webhook Setup

- Initialize the FastAPI backend (`backend/`).
- Setup the MongoDB connection utility (Beanie + Motor).
- Create a mock `POST /api/webhook/whatsapp` route that receives a message, logs it, and echoes a hardcoded response back to the WhatsApp API.

### Phase 2: The Brain Integration

- Integrate the Gemini SDK.
- Replace the hardcoded echo with a dynamic Gemini response.
- Establish a basic prompt template that defines the agent's personality and limits.

### Phase 3: Database & State Management

- Define the Beanie document models for `User` and `Integration`.
- Build the logic so the webhook fetches user state before calling Gemini, allowing the bot to **"remember"** who it is talking to.

### Phase 4: The Dashboard & First Connector

- Initialize Next.js for the dashboard only.
- Build a simple UI using Tailwind/Shadcn to display active integrations.
- Implement the first data connector (e.g., a simple API key submission for WakaTime or GitHub).
- Write the logic to store it securely in the DB.

---

## Development Rules

1. **Modularity** — Keep functions modular and isolated. The Gemini prompting logic should be separated from the webhook routing logic.
2. **Serverless-first** — Assume a serverless environment. Do not rely on in-memory state or background processes that outlive a single HTTP request.
3. **Prioritize speed** — Webhooks will time out if DB queries or API calls take too long.
4. **Strictly typed code** — Write clean, strictly typed Python (backend) and TypeScript (frontend).

---

## Working Agreement

- The user will provide step-by-step instructions; do not jump phases ahead.
- Do **not** remove existing functionality while adding new features.
- Do **not** remove any existing comments.
- Do **not** add new comments unless explicitly told to.
