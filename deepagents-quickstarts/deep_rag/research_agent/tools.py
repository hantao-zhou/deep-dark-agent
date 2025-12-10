"""RAG tools for answering questions against uploaded files."""

import os
from pathlib import Path
from typing import Iterable, Sequence

from langchain_core.documents import Document
from langchain_core.tools import InjectedToolArg, tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing_extensions import Annotated

DEFAULT_UPLOAD_DIR = Path(
    os.getenv("UPLOAD_DIR", Path(__file__).resolve().parents[3] / "uploads")
)
MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_BASE_URL = os.getenv("EMBEDDING_BASE_URL")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY")


def _load_text_files(
    upload_dir: Path, only: Sequence[str] | None = None
) -> list[Document]:
    """Load text-like files from disk into Document objects."""
    if not upload_dir.exists():
        return []

    allowlist = {name.lower() for name in only} if only else None
    documents: list[Document] = []
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)

    for path in sorted(upload_dir.iterdir()):
        if not path.is_file():
            continue

        if allowlist and path.name.lower() not in allowlist:
            continue

        if path.suffix.lower() not in {".txt", ".md", ".markdown", ".json", ".csv"}:
            continue

        try:
            size_bytes = path.stat().st_size
            if size_bytes > MAX_FILE_BYTES:
                continue

            content = path.read_text(encoding="utf-8", errors="ignore")
            if not content.strip():
                continue

            base_doc = Document(
                page_content=content,
                metadata={
                    "source": path.name,
                    "path": str(path),
                    "bytes": size_bytes,
                },
            )
            documents.extend(splitter.split_documents([base_doc]))
        except Exception:
            continue

    return documents


def _build_vector_store(docs: Iterable[Document]) -> InMemoryVectorStore | None:
    """Create an in-memory vector store from the provided documents."""
    docs_list = list(docs)
    if not docs_list:
        return None

    if not EMBEDDING_MODEL:
        return None

    try:
        embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=EMBEDDING_API_KEY,
            base_url=EMBEDDING_BASE_URL,
        )
        return InMemoryVectorStore.from_documents(docs_list, embeddings)
    except Exception:
        return None


@tool(parse_docstring=True)
def list_uploaded_files(
    grounding_files: Annotated[list[str] | None, InjectedToolArg] = None,
) -> str:
    """List available uploaded files and indicate which are selected for grounding.

    Args:
        grounding_files: (Injected) Files the user marked for RAG grounding.
    """
    upload_dir = DEFAULT_UPLOAD_DIR
    if not upload_dir.exists():
        return "No uploads directory found. Upload files via the UI first."

    paths = [p for p in sorted(upload_dir.iterdir()) if p.is_file()]
    if not paths:
        return f"No files in upload directory: {upload_dir}"

    selected = {f.lower() for f in grounding_files or []}
    lines = []
    for path in paths:
        marker = "[*]" if path.name.lower() in selected else "[ ]"
        try:
            size = path.stat().st_size
            lines.append(f"{marker} {path.name} ({size} bytes)")
        except Exception:
            lines.append(f"{marker} {path.name}")
    return "Available uploaded files:\n" + "\n".join(lines)


@tool(parse_docstring=True)
def retrieve_uploaded_context(
    query: str,
    top_k: int = 4,
    grounding_files: Annotated[list[str] | None, InjectedToolArg] = None,
    upload_dir: Annotated[str | None, InjectedToolArg] = None,
) -> str:
    """Search uploaded files for context to answer the user's question.

    Args:
        query: Question to retrieve supporting context for.
        top_k: Maximum number of chunks to return (default: 4).
        grounding_files: (Injected) Optional list of files pre-selected in the UI.
        upload_dir: (Injected) Override upload directory path.
    """
    base_dir = Path(upload_dir) if upload_dir else DEFAULT_UPLOAD_DIR
    docs = _load_text_files(base_dir, grounding_files)
    if not docs:
        return (
            "No usable uploaded files found. Upload text/markdown/CSV/JSON files "
            "and select them for grounding."
        )

    store = _build_vector_store(docs)
    if store is None:
        return "Vector store unavailable. Check EMBEDDING_* env vars and file types."

    results = store.similarity_search(query, k=max(1, min(top_k, len(docs))))
    formatted: list[str] = []
    for idx, doc in enumerate(results, start=1):
        snippet = doc.page_content.strip()
        if len(snippet) > 800:
            snippet = snippet[:800] + "..."
        source = doc.metadata.get("source", "unknown")
        formatted.append(f"[{idx}] Source: {source}\n{snippet}")

    return "Retrieved context from uploaded files:\n\n" + "\n\n".join(formatted)


@tool(parse_docstring=True)
def think_tool(reflection: str) -> str:
    """Tool for strategic reflection on reasoning and next steps.

    Use this tool after retrieval to analyze results and plan next steps systematically.
    This creates a deliberate pause in the research workflow for quality decision-making.

    When to use:
        - After receiving retrieved content: What key information did I find?
        - Before deciding next steps: Do I have enough to answer comprehensively?
        - When assessing gaps: What specific information is still missing?
        - Before concluding: Can I provide a complete answer now?

    Args:
        reflection: Your detailed reflection on research progress, findings, gaps, and next steps

    Returns:
        Confirmation that reflection was recorded for decision-making
    """
    return f"Reflection recorded: {reflection}"
