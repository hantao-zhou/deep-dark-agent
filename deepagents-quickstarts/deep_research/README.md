# Deep Research (llama.cpp News Edition)

This quickstart runs the deepagents workflow against a llama.cpp server and a custom tool that scrapes a user-provided news site, then summarizes and analyzes a user-selected topic from that site.

## Prerequisites
- Install [uv](https://docs.astral.sh/uv/) package manager.
- Start an OpenAI-compatible llama.cpp server. Example (matches `launch-llama.md`):
  ```powershell
  llama-b7225-bin-win-hip-radeon-x64\llama-server.exe `
    -m models/ggml/Qwen3-VL-30B-A3B-Instruct-UD-Q6_K_XL.gguf `
    --mmproj models/mmproj-BF16.gguf `
    -c 102400 -ngl 99 -t 32 `
    --flash-attn on `
    --port 8080 --host 0.0.0.0 `
    --api-key local-llama `
    --jinja
  ```
- Copy `.env.example` to `.env` and set:
  - `LLAMA_BASE_URL` (default `http://localhost:8080/v1`)
  - `LLAMA_API_KEY` (e.g., `local-llama`)
  - `LLAMA_MODEL` (model alias/path you configured for the server)
  - Optional: `LANGSMITH_API_KEY` for LangGraph Studio.

## Setup
```bash
cd deep_research
uv sync
```

## Run Options
### 1) Jupyter Notebook
```bash
uv run jupyter notebook research_agent.ipynb
```

### 2) LangGraph Server
```bash
langgraph dev
```
LangGraph Studio opens in the browser. Submit a prompt that includes the news site URL and the topic you want summarized/analyzed. You can also connect [deep-agents-ui](https://github.com/langchain-ai/deep-agents-ui) to the running server.

## What Changed
- Model: uses llama.cpp via `ChatOpenAI` pointed at your local server (no Anthropic/OpenAI/Gemini APIs needed).
- Tools: `scrape_news_site(site_url, topic, max_articles)` crawls the provided site with httpx + BeautifulSoup and returns article markdown; `think_tool` handles structured reflection between scrapes.
- Workflow: plan tasks, delegate scraping to sub-agents, synthesize findings, and write `/final_report.md` with inline citations tied to scraped article URLs. No Tavily search or external API calls are used.

## Usage Tips
- Always include the target news site URL and topic in your prompt.
- Keep scrapes focused (1–3 tool calls). If the first scrape lacks coverage, adjust the topic keyword or section URL and try again.
- Update `LLAMA_*` env vars if your server runs on a different host/port or uses a different model alias.
