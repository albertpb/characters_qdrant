from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import characters, health
from app.core.config import get_settings
from app.services.qdrant import ensure_characters_collection


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_characters_collection()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(characters.router, prefix="/api/v1")
