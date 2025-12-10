# Deep RAG (Uploaded Files)

This quickstart runs the deepagents workflow against an OpenAI-compatible chat model and answers questions grounded in files you upload through the UI.

## Prerequisites
- Install [uv](https://docs.astral.sh/uv/) package manager.
- Run an OpenAI-compatible chat endpoint (e.g., llama.cpp server) and set `LLAMA_*` env vars.
- Run an OpenAI-compatible embeddings endpoint for retrieval and set `EMBEDDING_*` env vars.
- Ensure the shared uploads directory exists (default `../uploads` from this package root) so both the LangGraph server and UI can read files.
- Copy `.env.example` to `.env` and set:
  - `LLAMA_BASE_URL`, `LLAMA_API_KEY`, `LLAMA_MODEL`
  - `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`
  - Optional: `LANGSMITH_API_KEY` for LangGraph Studio.

## Setup
```bash
cd deep_rag
uv sync
```

## Run
```bash
langgraph dev
```
Then open LangGraph Studio or connect [deep-agents-ui](../../deep-agents-ui) to the running server. From the UI, upload files, mark the ones to ground on, and ask questions.

## What Changed
- Tools: `list_uploaded_files` to inspect available/selected files; `retrieve_uploaded_context` to run semantic search over uploaded text/markdown/CSV/JSON; `think_tool` for reflection.
- Workflow: the agent always grounds answers in retrieved context and cites filenames.
- Storage: uploads live in `../uploads` by default so the UI and LangGraph process can share them.

## Usage Tips
- Prefer `.txt`, `.md`, `.json`, or `.csv` files; large binaries are ignored.
- Select files in the UI to restrict grounding to a subset; otherwise all uploaded files are searched.
- If retrieval returns nothing relevant, upload richer sources or adjust your question.
