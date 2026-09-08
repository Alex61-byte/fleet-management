---
name: gap-fill-stage
description: "Fill missing pipeline artifacts for a slice (BA, design, contracts, BE, or FE), then continue the line to done. Use when a stage was skipped or is incomplete."
argument-hint: "What is missing + slice (e.g. missing page specs for driver password change)..."
agent: agent
---
# Gap-fill — produce missing stage, then finish

Something required for this slice is missing or incomplete. **Do not dump the gap on the user** — produce it via the right specialist, then **auto-advance** remaining stages to done.

**Gap / slice:** $ARGUMENTS

## Rules

Follow [.github/copilot-instructions.md](../copilot-instructions.md).

1. Identify the **first incomplete** stage for the slice (BA → Design → Architect → Backend → Frontend).  
2. Run that specialist until its **Done when** bar is met (update docs/design/contracts as appropriate).  
3. Continue remaining stages without asking “continue?”. Backend before frontend.  
4. If the ask is technical-only and product artifacts already suffice, start at Architect.

## Sources (targeted reads only)

- Product: [docs/requirements.md](../../docs/requirements.md), [docs/business-rules.md](../../docs/business-rules.md), [docs/stories.md](../../docs/stories.md)
- Design: [design/](../../design/)
- Architecture: [docs/architecture.md](../../docs/architecture.md), [docs/adr/](../../docs/adr/), [docs/contracts/http-v1.md](../../docs/contracts/http-v1.md)

## Done when

Missing artifacts exist and the request is **implemented and verified**, or Blocked only for true ambiguity / secrets / destructive consent.

**Token budget:** follow [.github/copilot-instructions.md](../copilot-instructions.md) § Token budget. Paths/Delta only in chat; write artifacts to files.
