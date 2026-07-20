from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from qdrant_client import models

from app.core.config import get_settings
from app.models.character import CharacterCreate, CharacterCreateResponse
from app.services.embeddings import ImageEmbeddingError, get_image_embedder
from app.services.qdrant import get_qdrant_client
from app.services.storage import remove_character_images, store_image

router = APIRouter(prefix="/characters", tags=["characters"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_character(
    name: Annotated[str, Form(min_length=1)],
    images: Annotated[list[UploadFile], File(min_length=1)],
    aliases: Annotated[list[str] | None, Form()] = None,
    franchise: Annotated[str | None, Form()] = None,
    media_type: Annotated[str | None, Form()] = None,
    tags: Annotated[list[str] | None, Form()] = None,
    universe: Annotated[str | None, Form()] = None,
    studio: Annotated[str | None, Form()] = None,
    publisher: Annotated[str | None, Form()] = None,
    developer: Annotated[str | None, Form()] = None,
    year: Annotated[int | None, Form(ge=0, le=9999)] = None,
    nsfw: Annotated[bool, Form()] = False,
) -> CharacterCreateResponse:
    """Accept metadata and image uploads for the character ingestion pipeline."""
    if any(not image.content_type or not image.content_type.startswith("image/") for image in images):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="All uploaded files must have an image content type.",
        )

    character_id = uuid4()
    image_ids = [uuid4() for _ in images]
    payload = CharacterCreate.model_validate(
        {
            "name": name,
            "aliases": aliases or [],
            "franchise": franchise,
            "media_type": media_type,
            "tags": tags or [],
            "universe": universe,
            "studio": studio,
            "publisher": publisher,
            "developer": developer,
            "year": year,
            "nsfw": nsfw,
        }
    ).model_dump(mode="json")
    payload["id"] = str(character_id)

    try:
        embedder = get_image_embedder()
        points = []
        for image_id, image in zip(image_ids, images, strict=True):
            content = await image.read()
            embedding = embedder.embed_image(content)
            source = store_image(character_id, image_id, image, content)
            points.append(
                models.PointStruct(
                    id=image_id,
                    vector={"image": embedding},
                    payload={**payload, "image_source": source},
                )
            )
        settings = get_settings()
        get_qdrant_client().upsert(
            collection_name=settings.qdrant_collection,
            points=points,
            wait=True,
        )
    except ImageEmbeddingError as exc:
        remove_character_images(character_id)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        remove_character_images(character_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to store character in Qdrant: {exc}",
        ) from exc

    return CharacterCreateResponse(character_id=character_id, image_ids=image_ids)
