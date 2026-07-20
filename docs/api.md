# API

Base URL: `http://localhost:8000`

## Health

`GET /health`

Returns `200` when the API can reach Qdrant, otherwise `503`.

## Characters

`POST /api/v1/characters`

Accepts `multipart/form-data`. Use `images` for one or more image file uploads.
The required indexed field is `name`; all other index fields are optional.
Repeat `aliases`, `tags`, or `images` form keys to send multiple values.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/characters \
  -F "name=Example Character" \
  -F "aliases=Example" \
  -F "franchise=Example Franchise" \
  -F "media_type=anime" \
  -F "tags=hero" \
  -F "year=2026" \
  -F "nsfw=false" \
  -F "images=@./character.png"
```

The endpoint validates metadata and uploaded image content types, stores each
upload under `data/images/`, generates a Qwen3-VL image vector, and writes one
Qdrant point per image. Image vectors use the official `SentenceTransformer`
interface for Qwen3-VL-Embedding and must produce
`CHARDB_IMAGE_VECTOR_SIZE` values.

## Image Search

`POST /api/v1/characters/search/image`

Accepts either `multipart/form-data` with one `image` upload or JSON with an
`image_base64` field. Both forms accept an optional `limit` from 1 to 100
(default: 10). It embeds the image with Qwen3-VL-Embedding and returns the
nearest indexed character images with cosine similarity scores.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/characters/search/image \
  -F "image=@./query.png" \
  -F "limit=10"
```

```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUg...",
  "limit": 10
}
```
