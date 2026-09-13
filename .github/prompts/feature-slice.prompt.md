---
name: feature-slice
description: "Run the full fleet feature pipeline (BA → Design → Architect → Backend → Frontend) for a new behavior or UI structure. Use when starting a product slice."
argument-hint: "Feature slice (e.g. driver hard-delete confirmation, vehicle compliance banners)..."
agent: agent
---
# Feature slice — full pipeline

**User request:** $ARGUMENTS

Follow [.github/copilot-instructions.md](../copilot-instructions.md). **Auto-advance. Token budget hard. Size-tier first.**

## Tier gate (do this before stages)
- **Micro** (copy/spacing/one-liner) → in-place; stop.
- **Small** (UI chrome / client project on existing API payload / pure helper / BE no-op obvious) → **no specialist chain**: minimal doc amend (story/rule/design tail) + implement FE/SDK + targeted verify. Optional 5-line Arch note in chat only if contract policy changes; skip Design/BA agents.
- **Full** only if new API, new multi-step flow, or authz/tenancy design is required.

## Stages (Full only, or incomplete artifacts on larger work)
1. BA — docs write; chat ≤10 lines
2. Design — in-scope screens; chat paths only
3. Architect — ADR/contract delta or BE **no-op**; chat ≤8 lines
4. Backend — `/v1` or no-op + tests
5. Frontend — web/mobile + tests

Skip complete stages (1-path spot-check). BE before FE. No invented stories/tokens/contracts.

## Token rules
- Subagent prompt ≤15 lines; Paths/Delta/Decisions/Next ≤3 each
- No doc paste in chat; no transcript replay
- Explore **quick** once **only** if paths unknown — never on Small when list/page paths are known
- User summary: final **≤12 lines** (not per-stage essays)

## Done
Implemented + verified (targeted tests/typecheck). Stop only for true ambiguity, secrets, or destructive consent.
