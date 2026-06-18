---
name: swarm-orchestrator
description: Use when coordinating multiple AI agents for sports, fantasy, or market-analysis tasks, especially when the work benefits from role-based decomposition, disagreement analysis, critique loops, and a final synthesized recommendation across development or production runtimes.
---

# Swarm Orchestrator

Use this skill when one agent should not do all the reasoning alone.

## Agent roles

Start with these roles unless the task clearly needs fewer:

- Research Scout
- Context Analyst
- Projection Analyst
- Risk Analyst
- Critic
- Final Synthesizer

## Core loop

1. Define the decision question precisely.
2. Assign narrow subproblems to role agents.
3. Require structured outputs from each agent.
4. Compare outputs for agreement, disagreement, and missing evidence.
5. Re-run only the weak or conflicting areas.
6. Produce a final recommendation with assumptions and confidence.

## Required output fields per agent

```json
{
  "thesis": "",
  "evidence": [],
  "assumptions": [],
  "confidence": 0,
  "known_unknowns": [],
  "next_checks": []
}
```

## Orchestration rules

- Do not ask every agent to do everything.
- Keep prompts role-specific and short.
- Prefer retrying one weak agent over rerunning the whole swarm.
- Treat disagreement as signal, not failure.
- Preserve the trace so outcomes can be evaluated later.

## Synthesis rules

The final answer should always include:

- best current recommendation,
- main reasons,
- top risks,
- what would change the recommendation,
- confidence level,
- evidence gaps still open.
