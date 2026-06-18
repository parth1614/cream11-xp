# Stack Decisions

## Current decisions

### 1. LLM access

Use OpenRouter as the default AI gateway.

Why:

- one API surface for many models,
- straightforward app integration,
- model routing and fallback support,
- easy bring-your-own-key product story.

Implementation direction:

- users provide an `OPENROUTER_API_KEY`,
- the app routes all agent model calls through OpenRouter,
- advanced users can later configure model preferences or provider ordering.

### 2. Search and crawling

Use Firecrawl first for the MVP.

Why:

- cheaper starting point for an open-source product,
- supports scrape, crawl, search, and monitoring in one system,
- good fit for broad ingestion pipelines.

Keep Exa as a future optional adapter for premium search quality, especially if we want side-by-side evaluation on high-value queries.

## Pricing snapshot

As of June 16, 2026, the official pricing pages showed:

- Firecrawl free plan: 1,000 credits per month; Hobby: $16/month billed yearly.
- Firecrawl usage notes: scrape, crawl, map, and monitor cost 1 credit per page; search costs 2 credits per 10 results.
- Exa free tier: up to 20,000 requests per month for free.
- Exa search: $7 per 1,000 requests.
- Exa contents: $1 per 1,000 pages per content type.

This makes Firecrawl the simpler low-cost default for broad crawl-and-search workflows, while Exa remains attractive where search quality or AI-search ergonomics justify the spend.

## Product onboarding rule

The MVP should work when a user only provides:

- `OPENROUTER_API_KEY`

Everything else should be optional or powered by platform defaults.

## Sources

- OpenRouter quickstart: https://openrouter.ai/docs/quickstart
- OpenRouter BYOK: https://openrouter.ai/docs/guides/overview/auth/byok
- Exa pricing: https://exa.ai/pricing
- Firecrawl pricing: https://www.firecrawl.dev/pricing
