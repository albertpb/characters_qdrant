from fastapi import APIRouter, HTTPException, status

from app.services.qdrant import get_qdrant_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    try:
        get_qdrant_client().get_collections()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Qdrant is unavailable",
        ) from exc

    return {"status": "ok"}
