import shutil
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.core.config import get_settings


def store_image(character_id: UUID, image_id: UUID, upload: UploadFile, content: bytes) -> str:
    """Store an uploaded image locally and return its stable relative source path."""
    extension = Path(upload.filename or "").suffix.lower() or ".bin"
    directory = get_settings().image_upload_dir / str(character_id)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{image_id}{extension}"
    destination.write_bytes(content)
    return destination.relative_to(get_settings().image_upload_dir.parent).as_posix()


def remove_character_images(character_id: UUID) -> None:
    shutil.rmtree(get_settings().image_upload_dir / str(character_id), ignore_errors=True)
