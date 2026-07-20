from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Character Search Engine API"
    environment: str = "development"
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_collection: str = "characters"
    text_embedding_model: str = "Qwen/Qwen3-Embedding-4B"
    image_embedding_model: str = "Qwen/Qwen3-VL-Embedding-2B"
    hf_token: str | None = None
    text_vector_size: int = 2048
    image_vector_size: int = 2048
    text_embedding_device: str | None = None
    image_embedding_device: str | None = None
    image_upload_dir: Path = PROJECT_ROOT / "data" / "images"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_prefix="CHARDB_",
        extra="forbid",
    )

    @property
    def resolved_qdrant_url(self) -> str:
        return self.qdrant_url or f"http://{self.qdrant_host}:{self.qdrant_port}"

@lru_cache
def get_settings() -> Settings:
    return Settings()
