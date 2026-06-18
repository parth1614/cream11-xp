# Team Memory Layer

## Goal

Create one markdown memory file per national team so the orchestrator and downstream agents can reuse durable football context across runs.

## Why this matters

Without memory files, every agent run starts cold.

With memory files, the system can:

- remember recurring team tendencies,
- keep a rolling snapshot of fantasy-relevant player form,
- preserve tournament context across multiple user sessions,
- update only what changed instead of regenerating everything.

## Storage shape

```text
memory/
  teams/
    _index.md
    algeria.md
    argentina.md
    ...
```

## File contract

Each team file should contain stable sections:

1. `Canonical Profile`
2. `Current Tournament Snapshot`
3. `Fantasy Priority Board`
4. `Historical Tournament Notes`
5. `Research Targets For Agents`
6. `Memory Update Log`

## Update model

Two write modes are allowed:

### Overwrite mode

Use for:

- current player stats,
- next fixtures,
- current tournament record,
- current fantasy leaders,
- manager or squad facts that are now verified and newer.

### Append mode

Use for:

- change-log entries,
- new observations,
- new external-research findings with provenance,
- unresolved watch items.

## Trigger model

The eventual memory agent should trigger:

- after any team-specific user query,
- after any active-match orchestration run,
- after a scheduled data refresh,
- after post-match result settlement.

## Prompt routing

Do not inject all team files into every run.

Instead:

- load only the teams relevant to the active match,
- optionally load additional teams mentioned explicitly in the user query,
- keep the memory payload compact and source-aware.

## Current data coverage

The initial generator uses the current official FIFA Fantasy public feeds for:

- fixtures,
- team participation,
- player fantasy pricing,
- ownership,
- points,
- form,
- round-level status.

Historical tournament performance is scaffolded as a section but still expects richer research sources later.
