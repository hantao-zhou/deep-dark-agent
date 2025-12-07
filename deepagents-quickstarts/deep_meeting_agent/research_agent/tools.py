"""Research tools focused on scraping news websites."""

from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from langchain_core.tools import InjectedToolArg, tool
from markdownify import markdownify
from typing_extensions import Annotated

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    )
}


def _fetch_html(url: str, timeout: float) -> tuple[str | None, str | None]:
    """Fetch raw HTML from a URL."""
    try:
        response = httpx.get(url, headers=HEADERS, timeout=timeout, follow_redirects=True)
        response.raise_for_status()
        return response.text, None
    except Exception as exc:  # noqa: BLE001
        return None, f"Error fetching {url}: {exc}"


def _extract_article_links(
    html: str, base_url: str, topic: str, max_articles: int
) -> list[tuple[str, str]]:
    """Pull likely article links from a news page."""
    soup = BeautifulSoup(html, "html.parser")
    topic_lower = topic.lower().strip()
    seen: set[str] = set()
    matched: list[tuple[str, str]] = []
    fallback: list[tuple[str, str]] = []

    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        title = anchor.get_text(" ", strip=True)
        full_url = urljoin(base_url, href)

        if not full_url.startswith(("http://", "https://")):
            continue
        if full_url in seen:
            continue
        seen.add(full_url)

        if not title:
            title = full_url

        if topic_lower:
            if topic_lower in title.lower() or topic_lower in href.lower():
                matched.append((full_url, title))
        elif len(title) > 30:
            fallback.append((full_url, title))

        if len(matched) >= max_articles:
            break

    if matched:
        return matched[:max_articles]

    return fallback[:max_articles]


@tool(parse_docstring=True)
def scrape_news_site(
    site_url: str,
    topic: Annotated[str, InjectedToolArg] = "",
    max_articles: Annotated[int, InjectedToolArg] = 3,
    timeout: Annotated[float, InjectedToolArg] = 10.0,
) -> str:
    """Scrape a news site for articles and return their markdown content.

    Args:
        site_url: Homepage or section page to crawl for articles.
        topic: Keyword to prioritize in article titles/links (case-insensitive). Leave blank for top stories.
        max_articles: Maximum number of articles to fetch (default: 3).
        timeout: Request timeout in seconds for each HTTP request.

    Returns:
        Markdown content for the fetched articles with URLs.
    """
    index_html, error = _fetch_html(site_url, timeout)
    if error:
        return error

    articles = _extract_article_links(index_html, site_url, topic, max_articles)
    if not articles:
        return f"No articles matched topic '{topic}' at {site_url}"

    result_blocks = []
    for url, title in articles:
        article_html, article_error = _fetch_html(url, timeout)
        if article_error or not article_html:
            result_blocks.append(
                f"## {title}\n**URL:** {url}\n\n{article_error or 'No content'}\n---"
            )
            continue

        markdown_content = markdownify(article_html)
        result_blocks.append(
            f"## {title}\n**URL:** {url}\n\n{markdown_content}\n---"
        )

    return (
        f"Scraped {len(result_blocks)} article(s) from {site_url} "
        f"for topic '{topic or 'top stories'}':\n\n" + "\n\n".join(result_blocks)
    )


@tool(parse_docstring=True)
def think_tool(reflection: str) -> str:
    """Tool for strategic reflection on research progress and decision-making.

    Use this tool after each scrape to analyze results and plan next steps systematically.
    This creates a deliberate pause in the research workflow for quality decision-making.

    When to use:
        - After receiving scraped content: What key information did I find?
        - Before deciding next steps: Do I have enough to answer comprehensively?
        - When assessing gaps: What specific information is still missing?
        - Before concluding research: Can I provide a complete answer now?

    Args:
        reflection: Your detailed reflection on research progress, findings, gaps, and next steps

    Returns:
        Confirmation that reflection was recorded for decision-making
    """
    return f"Reflection recorded: {reflection}"
