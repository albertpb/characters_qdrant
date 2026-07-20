from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


NonEmptyString = Annotated[str, Field(min_length=1)]


class CharacterMetadata(BaseModel):
    """Metadata shared by the API and the Qdrant point payload."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: NonEmptyString
    aliases: list[NonEmptyString] = Field(default_factory=list)
    franchise: str | None = None
    media_type: str | None = None
    tags: list[NonEmptyString] = Field(default_factory=list)
    universe: str | None = None
    studio: str | None = None
    publisher: str | None = None
    developer: str | None = None
    year: int | None = Field(default=None, ge=0, le=9999)
    nsfw: bool = False


class CharacterCreate(CharacterMetadata):
    """Validated character metadata used by the ingestion endpoint."""


class CharacterCreateResponse(BaseModel):
    character_id: UUID
    image_ids: list[UUID]
