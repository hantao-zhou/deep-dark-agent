# Deepagent Quickstarts

[Deepagents](https://github.com/langchain-ai/deepagents) is an open source agent harness inspired by systems like Claude Code and Manus. It supports planning, filesystem access, and sub-agent delegation out of the box. This repo hosts ready-to-run quickstarts you can adapt to your own workflows.

## Resources
- [Documentation](https://docs.langchain.com/oss/python/deepagents/overview)
- [Deepagents Repo](https://github.com/langchain-ai/deepagents)

## Quickstarts

| Quickstart Name | Location | Description | Usage Options |
|-----------------|----------|-------------|---------------|
| [Deep Research](deep_research/README.md) | `deep_research/` | News-focused research agent that scrapes a user-provided site with llama.cpp, coordinates parallel sub-agents, and writes a sourced report | Jupyter Notebook or LangGraph Server |

## Built-In Deepagent Components

Every deepagent includes a common toolset:

| Tool Name | Description |
|-----------|-------------|
| `write_todos` | Create and manage structured task lists |
| `ls` | List files in a directory (absolute paths) |
| `read_file` | Read file content with optional pagination |
| `write_file` | Create or overwrite files |
| `edit_file` | Perform exact string replacements |
| `glob` | Find files matching a pattern (e.g., `**/*.py`) |
| `grep` | Search for text patterns within files |
| `execute` | Run shell commands in a sandboxed environment (if supported by the backend) |
| `task` | Delegate tasks to specialized sub-agents with isolated context |

Default middleware layers add these tools, handle summarization when context grows large, and provide human-in-the-loop breakpoints when configured.

## Writing Custom Instructions

Pass a `system_prompt` to `create_deep_agent()` to layer custom guidance on top of the defaults. Good instructions:
- Define domain-specific workflows (e.g., research steps, QA checks)
- Provide concrete examples
- Set limits and stopping criteria
- Explain how the tools should work together

Avoid re-explaining built-in tools or contradicting the default middleware instructions; focus on domain-specific behavior.
