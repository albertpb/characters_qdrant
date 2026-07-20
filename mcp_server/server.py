import base64
from pathlib import Path
from typing import Any

import httpx
from fastmcp import FastMCP
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class McpSettings(BaseSettings):
    character_api_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_prefix="CHARDB_",
        extra="ignore",
    )


settings = McpSettings()
mcp = FastMCP("Character Search")


def _read_image(image_path: str | None, image_base64: str | None) -> str:
    if bool(image_path) == bool(image_base64):
        raise ValueError("Provide exactly one of image_path or image_base64.")

    if image_base64:
        if image_base64.startswith("data:"):
            return image_base64
        try:
            base64.b64decode(image_base64, validate=True)
        except ValueError as exc:
            raise ValueError("image_base64 must be valid base64 data.") from exc
        return image_base64

    path = Path(image_path).expanduser()
    if not path.is_file():
        raise ValueError(f"Image file does not exist: {path}")
    return base64.b64encode(path.read_bytes()).decode("ascii")


@mcp.tool()
async def search_character_by_image(
    image_path: str | None = None,
    image_base64: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Search using an image that already exists on the local filesystem.

    image_path must be an absolute Windows filesystem path, such as:
    M:\\CharDB\\uploads\\query.png

    Do not invent a filename. Only call this tool when the user has
    provided an actual accessible filesystem path.
    """
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100.")

    encoded_image = _read_image(image_path, image_base64)
    url = f"{settings.character_api_url.rstrip('/')}/api/v1/characters/search/image"
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                json={"image_base64": encoded_image, "limit": limit},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise RuntimeError(f"Character API search failed ({exc.response.status_code}): {detail}") from exc
    except httpx.HTTPError as exc:
        raise RuntimeError("Character API is unavailable.") from exc

    return response.json()


if __name__ == "__main__":
    mcp.run()
