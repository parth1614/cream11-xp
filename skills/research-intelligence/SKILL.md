---
name: research-intelligence
description: Use when gathering football, sports, fantasy, or prediction-market intelligence from multiple sources, especially when the work requires source comparison, freshness checks, provenance tracking, and extraction of structured evidence for downstream agents in any runtime.
---

# Research Intelligence

Use this skill when the task is to gather, compare, and structure evidence rather than jump straight to a recommendation.

## Goals

- Find the highest-signal sources first.
- Preserve source provenance on every important claim.
- Separate facts, rumors, opinions, and model inferences.
- Produce structured evidence that later agents can reuse.

## Workflow

1. Define the decision target.
2. Identify the minimum entities needed: competition, fixture, teams, players, market, and deadline.
3. Gather fresh sources, prioritizing official or primary sources.
4. Extract discrete evidence items instead of long summaries.
5. Score each evidence item for freshness, reliability, and relevance.
6. Highlight conflicts and unresolved gaps.

## Output format

Prefer returning evidence in a consistent shape:

```json
{
  "claim": "",
  "entity": "",
  "source": "",
  "timestamp": "",
  "reliability": "high|medium|low",
  "freshness": "fresh|aging|stale",
  "type": "fact|report|opinion|inference",
  "impact": "",
  "notes": ""
}
```

## Important rules

- Never flatten conflicting reports into fake certainty.
- Explicitly label rumors and unconfirmed lineup news.
- Prefer concise evidence bullets over narrative prose.
- If a source is derivative, try to find the original upstream source.
- When browsing current information, use concrete dates and times.

## When to escalate

Escalate to the orchestrator when:

- sources disagree on a high-impact issue,
- freshness is poor near deadline,
- multiple entities are unresolved,
- a recommendation would be premature.
