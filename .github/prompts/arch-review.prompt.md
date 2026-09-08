---
name: arch-review
description: "Senior Software Architect only: boundaries, options, contracts/ADRs, BE/FE ownership. Recommend — no app code."
argument-hint: "System or change to design/review (e.g. fleet tracking boundaries, API vs events)..."
agent: Senior Software Architect
---
Recommend architecture for this change. Do **not** implement or edit app source.

**Ask:** $ARGUMENTS

**Gate:** For product slices, BA + design should exist. If missing, **Blocked** and name the specialist. For pure tech diagnosis, root cause + owner is enough.

Ground in [docs/architecture.md](../../docs/architecture.md), [docs/adr/](../../docs/adr/), [docs/contracts/http-v1.md](../../docs/contracts/http-v1.md), and existing code.

## Deliver

1. Context  
2. Quality attributes & constraints  
3. Options (2–3) + trade-offs  
4. Recommendation + when to revisit  
5. Sketch (Mermaid if useful)  
6. Risks  
7. Next artifacts: ADR outline, contract delta, **Backend work or explicit HTTP unchanged / BE no-op**, then Frontend  

Prefer extending ADR-001 modular Fastify monolith unless BA forces a split. Hand off **Backend before Frontend**.

**Token budget:** follow [.github/copilot-instructions.md](../copilot-instructions.md) § Token budget. Paths/Delta only in chat; write artifacts to files.
