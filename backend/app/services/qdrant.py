from functools import lru_cache

from qdrant_client import QdrantClient, models

from app.core.config import get_settings


PAYLOAD_INDEXES: dict[str, models.PayloadSchemaType] = {
    "name": models.PayloadSchemaType.KEYWORD,
    "aliases": models.PayloadSchemaType.KEYWORD,
    "franchise": models.PayloadSchemaType.KEYWORD,
    "media_type": models.PayloadSchemaType.KEYWORD,
    "tags": models.PayloadSchemaType.KEYWORD,
    "universe": models.PayloadSchemaType.KEYWORD,
    "studio": models.PayloadSchemaType.KEYWORD,
    "publisher": models.PayloadSchemaType.KEYWORD,
    "developer": models.PayloadSchemaType.KEYWORD,
    "year": models.PayloadSchemaType.INTEGER,
    "nsfw": models.PayloadSchemaType.BOOL,
}


@lru_cache
def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(
        url=settings.resolved_qdrant_url,
        api_key=settings.qdrant_api_key,
    )


def ensure_characters_collection() -> None:
    """Create the documented collection and payload indexes if absent."""
    settings = get_settings()
    client = get_qdrant_client()

    if not client.collection_exists(settings.qdrant_collection):
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config={
                "text": models.VectorParams(
                    size=settings.text_vector_size,
                    distance=models.Distance.COSINE,
                ),
                "image": models.VectorParams(
                    size=settings.image_vector_size,
                    distance=models.Distance.COSINE,
                )
            },
        )

    for field_name, field_schema in PAYLOAD_INDEXES.items():
        client.create_payload_index(
            collection_name=settings.qdrant_collection,
            field_name=field_name,
            field_schema=field_schema,
            wait=True,
        )
