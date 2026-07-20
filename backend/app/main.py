from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import characters, health
from app.core.config import get_settings
from app.services.qdrant import ensure_characters_collection


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_characters_collection()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(health.router)
app.include_router(characters.router, prefix="/api/v1")
