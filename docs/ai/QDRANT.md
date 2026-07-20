# Qdrant Collections

Collection

characters

## Connection

Configure the Qdrant endpoint with environment variables:

```text
CHARDB_QDRANT_HOST=localhost
CHARDB_QDRANT_PORT=6333
```

`CHARDB_QDRANT_URL` is an optional full-URL override for hosted Qdrant
instances. `CHARDB_QDRANT_API_KEY` supplies an API key when required.

Vectors

text

- Model: `Qwen/Qwen3-Embedding-8B-GGUF`
- Dimensions: 4096
- Distance: cosine

image

- Model: `mradermacher/Qwen3-VL-Embedding-8B-GGUF`
- Dimensions: configurable with `CHARDB_IMAGE_VECTOR_SIZE` (must match the
  existing collection; current deployment: 4096)
- Distance: cosine

The API loads GGUF files in-process through `llama-cpp-python`. Configure the
text model with `CHARDB_TEXT_GGUF_PATH`; configure the image model and its
multimodal projection file with `CHARDB_IMAGE_GGUF_PATH` and
`CHARDB_IMAGE_MMPROJ_PATH`. The image projection file is required for image
embeddings.

Changing an embedding model or vector dimension requires a new collection and
re-ingestion of all affected embeddings.

Payload

id
name
aliases
franchise
media_type
tags
universe
studio
publisher
developer
year
nsfw
image_source
image_quality
image_resolution

Indexes

keyword

- name
- aliases
- franchise
- media_type
- tags
- universe
- studio
- publisher
- developer

integer

- year

boolean

- nsfw
