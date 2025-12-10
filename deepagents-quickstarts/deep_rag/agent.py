"""File-grounded RAG agent for LangGraph deployment."""

import os

from deepagents import create_deep_agent
from langchain_openai import ChatOpenAI

from research_agent.prompts import RESEARCH_WORKFLOW_INSTRUCTIONS
from research_agent.tools import (
    list_uploaded_files,
    retrieve_uploaded_context,
    think_tool,
)

INSTRUCTIONS = RESEARCH_WORKFLOW_INSTRUCTIONS

# Llama.cpp server configuration
LLAMA_API_KEY = os.getenv("LLAMA_API_KEY", "local-llama")
LLAMA_BASE_URL = os.getenv("LLAMA_BASE_URL", "http://localhost:8080/v1")
LLAMA_MODEL = os.getenv(
    "LLAMA_MODEL", "models/ggml/Qwen3-VL-30B-A3B-Instruct-UD-Q6_K_XL.gguf"
)

model = ChatOpenAI(
    model=LLAMA_MODEL,
    base_url=LLAMA_BASE_URL,
    api_key=LLAMA_API_KEY,
    temperature=0.0,
)

agent = create_deep_agent(
    model=model,
    tools=[list_uploaded_files, retrieve_uploaded_context, think_tool],
    system_prompt=INSTRUCTIONS,
)
