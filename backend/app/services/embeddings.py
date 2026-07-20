from functools import lru_cache
from io import BytesIO

from PIL import Image
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings


class ImageEmbeddingError(RuntimeError):
    """Raised when Qwen cannot create a valid image embedding."""


class QwenVisionEmbedder:
    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._model = SentenceTransformer(
            settings.image_embedding_model,
            token=settings.hf_token,
            device=settings.image_embedding_device,
            trust_remote_code=True,
        )

    def embed_image(self, content: bytes) -> list[float]:
        try:
            image = Image.open(BytesIO(content)).convert("RGB")
            embedding = self._model.encode(
                image,
                normalize_embeddings=True,
                convert_to_numpy=True,
            ).tolist()
        except Exception as exc:
            raise ImageEmbeddingError("Unable to generate an image embedding.") from exc

        if len(embedding) != self._settings.image_vector_size:
            raise ImageEmbeddingError(
                "The generated image embedding has "
                f"{len(embedding)} dimensions, but CHARDB_IMAGE_VECTOR_SIZE is "
                f"{self._settings.image_vector_size}."
            )
        return embedding


@lru_cache
def get_image_embedder() -> QwenVisionEmbedder:
    return QwenVisionEmbedder()
