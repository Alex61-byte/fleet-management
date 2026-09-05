---
name: feature-slice
description: "Run the full fleet feature pipeline (BA → Design → Architect → Backend → Frontend) for a new behavior or UI structure. Use when starting a product slice."
argument-hint: "Feature slice (e.g. driver hard-delete confirmation, vehicle compliance banners)..."
agent: agent
---
# Feature slice — full pipeline

Implement this **product feature / behavior change / new UI structure** end-to-end.

**User request:** $ARGUMENTS

## Orchestration (mandatory)

Follow [.github/copilot-instructions.md](../copilot-instructions.md). **Auto-advance** stages. Do **not** ask the user to continue between specialists.

1. **Business Analyst** — problem, actors, MoSCoW, rules, INVEST stories + Given/When/Then  
2. **Design Specialist** — tokens + page specs (states, a11y, density) for in-scope screens only  
3. **Senior Software Architect** — boundaries, contract deltas, ADRs if needed; explicit BE no-op when HTTP unchanged  
4. **Senior Backend Specialist** — Fastify `/v1` against contracts (or documented no-op)  
5. **Senior Frontend Specialist** — Expo and/or Next against BA + design + contracts  

Skip only stages **already complete** for this slice (verify artifacts exist). Backend before frontend. Never invent stories, tokens, or contracts.

## Sources of truth (read only what the slice needs)

- Product: [docs/requirements.md](../../docs/requirements.md), [docs/business-rules.md](../../docs/business-rules.md), [docs/stories.md](../../docs/stories.md)
- Design: [design/](../../design/), [design/pages/_patterns.md](../../design/pages/_patterns.md)
- Architecture: [docs/architecture.md](../../docs/architecture.md), [docs/adr/](../../docs/adr/), [docs/contracts/http-v1.md](../../docs/contracts/http-v1.md)

Prefer specialist subagents (`Business Analyst`, `Design Specialist`, `Senior Software Architect`, `Senior Backend Specialist`, `Senior Frontend Specialist`) over one mixed mega-reply. Stay in role per stage.

## Done when

Slice is **implemented and verified** (tests/typecheck for touched packages), not merely handed off. Brief stage summaries; tables over essays. Stop only for true product ambiguity, missing user secrets, or destructive ops needing consent.
