---
name: feature-slice
description: "Run the full fleet feature pipeline (BA → Design → Architect → Backend → Frontend) for a new behavior or UI structure. Use when starting a product slice."
argument-hint: "Feature slice (e.g. driver hard-delete confirmation, vehicle compliance banners)..."
agent: agent
---
# Feature slice — full pipeline

**User request:** $ARGUMENTS

Follow [.github/copilot-instructions.md](../copilot-instructions.md). **Auto-advance. Token budget hard.**

## Stages
1. BA — problem, actors, MoSCoW, rules, INVEST + G/W/T (write docs; chat ≤20 lines)
2. Design — in-scope screens only (write `design/pages`; chat paths + states matrix)
3. Architect — contracts/ADR delta or BE **no-op** (write ADR/contract; chat recommendation table)
4. Backend — `/v1` or no-op + tests
5. Frontend — web/mobile against contracts + tokens + tests

Skip stages **already complete** (one-path verify). BE before FE. No invented stories/tokens/contracts.

## Token rules for this prompt
- Subagent prompt ≤25 lines; return Paths/Delta/Decisions/Next only
- No pasting docs into chat; link paths
- Explore **quick** once for code touchpoints if needed — not parallel full-doc BA
- User summary per stage: bullets only

## Done
Implemented + verified (targeted tests/typecheck). Stop only for true ambiguity, secrets, or destructive consent.
