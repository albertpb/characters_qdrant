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

Run it with
```bash
python.exe -m uvicorn app.main:app --app-dir backend --reload
```

### MCP Server

The stdio MCP server exposes `search_character_by_image` for MCP clients such
as LM Studio. Start the API first, then configure the client to run:

```bash
.venv\Scripts\python.exe -m mcp_server.server
```

Set `CHARDB_CHARACTER_API_URL` in `.env` when the API does not run at
`http://127.0.0.1:8000`.

### BFF

The NestJS BFF orchestrates image search and LM Studio chat requests so the
frontend communicates with only one service.

```bash
cd bff
npm install
```

Copy `bff/.env.example` to `bff/.env`, then run:

```bash
npm run start:dev
```

The BFF persists multiple conversations and messages in SQLite. By default the
database is created at `bff/data/chat-history.sqlite`; configure
`CHAT_DATABASE_PATH` in `bff/.env` to use a different location.

### Frontend

```bash
cd frontend
```

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

The chat frontend sends the prompt and optional image to the NestJS BFF, which
searches the character API, adds matching metadata to the chat context, calls
LM Studio, and returns the response. Copy `frontend/.env.example` to
`frontend/.env` to change the BFF URL.

## Goals

* High-quality semantic character search
* Clean and maintainable architecture
* Scalable vector search
* Well-documented APIs
* Easy contribution and extension

## License

Private project.
