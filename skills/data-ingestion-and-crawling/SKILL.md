---
name: data-ingestion-and-crawling
description: Use when building or extending the project's web search, crawling, scraping, parsing, or source-normalization systems for sports, fantasy, and prediction workflows, especially when reliability, provenance, freshness, and site-compliance matter across development and production runtimes.
---

# Data Ingestion And Crawling

Use this skill when the task is to fetch, parse, normalize, or monitor external information sources.

## Goals

- Maximize signal quality, not raw page volume.
- Preserve provenance from raw fetch through normalized record.
- Keep ingestion modular so connectors can be swapped or disabled.
- Prefer resilient pipelines over brittle one-off scrapers.

## Source priority

1. Official APIs and feeds
2. Official websites and competition pages
3. Reputable primary reporting
4. Community sources and social signals

## Connector workflow

1. Define the source type and access method.
2. Fetch raw artifacts with timestamps and identifiers.
3. Parse into structured fields.
4. Normalize entities into shared schemas.
5. Score freshness and extraction confidence.
6. Store both raw and normalized outputs.
7. Record errors and parser drift for maintenance.

## Minimum connector output

```json
{
  "source_name": "",
  "source_type": "",
  "fetched_at": "",
  "canonical_url": "",
  "entity_refs": [],
  "raw_artifact_ref": "",
  "parsed_facts": [],
  "freshness_score": 0,
  "parser_confidence": 0
}
```

## Reliability rules

- Prefer scheduled polling plus event-triggered refreshes near deadlines.
- Build parsers that fail loudly when selectors or structures drift.
- Cache raw responses so extraction changes can be replayed.
- Deduplicate near-identical items before they reach agents.

## Compliance rules

- Respect published terms, robots guidance, rate limits, and legal constraints.
- Prefer licensed, public, or permissioned access over adversarial scraping.
- Do not design anti-bot evasion as a default strategy.

## Escalation points

Escalate when:

- the source has unstable structure,
- official data is unavailable,
- the same fact appears differently across sources,
- the connector may create legal, operational, or maintenance risk.
