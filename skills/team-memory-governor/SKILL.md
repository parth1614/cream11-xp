---
name: team-memory-governor
description: Use when reading, updating, or governing long-lived national-team markdown memory files so agent runs keep reusable football context without mixing stale facts, speculative claims, and append-only observations.
---

Use this skill when the task involves persistent team memory.

## Purpose

The team memory layer exists so orchestrators and specialist agents can reuse durable context about a national team without rebuilding everything from scratch on every run.

These files are not free-form notes. They are governed knowledge artifacts.

## File model

Each national team should have one markdown file in `memory/teams/`.

Every file should separate:

- canonical profile facts that can be overwritten when verified,
- current tournament snapshot facts that should be refreshed often,
- historical notes that should only change with source-backed updates,
- append-only update logs that preserve provenance and recency.

## Update rules

1. Overwrite stale canonical facts only when newer verified evidence exists.
2. Refresh current-cycle stats whenever newer structured match or player data is available.
3. Append to the memory update log instead of deleting prior update history.
4. Never silently replace historical tournament claims without citing the new source and update date.
5. Mark unknowns clearly instead of hallucinating.

## Source discipline

- Prefer official competition or team data first.
- Preserve source URLs or source labels for every meaningful update.
- Keep timestamps in ISO format where possible.
- Distinguish observed facts from agent interpretations.

## Agent behavior

When this skill is active:

1. Load the relevant team memory files first.
2. Compare them with the newly retrieved evidence.
3. Decide which sections need overwrite vs append treatment.
4. Produce a compact structured delta before any write.
5. Write back only the affected team files.

## Safe write policy

Never let one noisy run rewrite the whole file.

Prefer:

- targeted canonical updates,
- targeted snapshot refreshes,
- short append-only memory log entries.

Avoid:

- replacing the whole file with a model summary,
- removing provenance,
- mixing rumor with verified fact,
- storing one-off user chatter as team memory.
