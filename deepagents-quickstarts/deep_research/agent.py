"""News-focused research agent for LangGraph deployment."""

import os
from datetime import datetime

from deepagents import create_deep_agent
from langchain_openai import ChatOpenAI

from research_agent.prompts import (
    RESEARCHER_INSTRUCTIONS,
    RESEARCH_WORKFLOW_INSTRUCTIONS,
    SUBAGENT_DELEGATION_INSTRUCTIONS,
)
from research_agent.tools import scrape_news_site, think_tool

# Limits
max_concurrent_research_units = 3
max_researcher_iterations = 3

# Get current date
current_date = datetime.now().strftime("%Y-%m-%d")

# Combine orchestrator instructions (RESEARCHER_INSTRUCTIONS only for sub-agents)
INSTRUCTIONS = (
    RESEARCH_WORKFLOW_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent_research_units,
        max_researcher_iterations=max_researcher_iterations,
    )
)

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

# Create research sub-agent
research_sub_agent = {
    "name": "research-agent",
    "description": "Delegate news scraping to the sub-agent researcher. Only give this researcher one site/topic at a time.",
    "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
    "tools": [scrape_news_site, think_tool],
}

# Create the agent
agent = create_deep_agent(
    model=model,
    tools=[scrape_news_site, think_tool],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
