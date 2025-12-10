"""Deep Research Agent Example.

This module demonstrates building a news-focused research agent using the
deepagents package with custom tools for site scraping and strategic thinking.
"""

from research_agent.prompts import (
    RESEARCHER_INSTRUCTIONS,
    RESEARCH_WORKFLOW_INSTRUCTIONS,
    SUBAGENT_DELEGATION_INSTRUCTIONS,
)
from research_agent.tools import (
    list_uploaded_files,
    retrieve_uploaded_context,
    think_tool,
)

__all__ = [
    "list_uploaded_files",
    "retrieve_uploaded_context",
    "think_tool",
    "RESEARCHER_INSTRUCTIONS",
    "RESEARCH_WORKFLOW_INSTRUCTIONS",
    "SUBAGENT_DELEGATION_INSTRUCTIONS",
]
