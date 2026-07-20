# Character Search Engine

A semantic search engine for anime, game characters, movie characters powered by **Qdrant** and AI embeddings.

## Features

* Semantic image search
* Hybrid (vector + keyword) search
* Character metadata filtering
* FastAPI backend
* Qdrant vector database
* Automatic embedding generation
* Multi-image support per character

## Tech Stack

* Python
* FastAPI
* Qdrant
* SQLAlchemy
* Qwen/Qwen3-Embedding-8B text embeddings
* Qwen/Qwen3-VL-Embedding image embeddings
* React (Frontend)

## Project Structure

```text
project/
├── backend/
├── frontend/
├── docs/
│   └── ai/
├── scripts/
├── data/
└── README.md
```

## Documentation

Project documentation can be found in:

```text
docs/ai/
```

Including:

* Architecture
* Qdrant configuration
* Character schema
* Search design
* Embedding pipeline
* API documentation
* Development guidelines

## Development

### Backend

```bash
cd backend
```

Install dependencies and start the API.

For CUDA 13.0 image embedding support, install PyTorch first:

```bash
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu130
```

### MCP Server

The stdio MCP server exposes `search_character_by_image` for MCP clients such
as LM Studio. Start the API first, then configure the client to run:

```bash
.venv\Scripts\python.exe -m mcp_server.server
```

Set `CHARDB_CHARACTER_API_URL` in `.env` when the API does not run at
`http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
```

Install dependencies and run the development server.

## Goals

* High-quality semantic character search
* Clean and maintainable architecture
* Scalable vector search
* Well-documented APIs
* Easy contribution and extension

## License

Private project.
