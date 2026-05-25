from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db, close_db
from app.api.routes import (
    auth,
    chat,
    context,
    conversations,
    cron,
    dev,
    health,
    integrations,
    users,
    webhook,
)
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="Orbit Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(context.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(integrations.router)
app.include_router(cron.router)
app.include_router(webhook.router)
if settings.enable_dev_routes:
    app.include_router(dev.router)
