---
name: design-screens
description: "Design Specialist only: semantic tokens + page specs (states, a11y, density) for in-scope screens. No feature code."
argument-hint: "Screen or design change (e.g. dispatch density, vehicles empty state)..."
agent: Design Specialist
---
Produce design-system and page-spec artifacts for the slice.

**Ask:** $ARGUMENTS

**Gate:** If BA stories/AC are missing or too vague, stop and say **Blocked → Business Analyst** (what is missing). Do not invent product scope.

Extend [design/](../../design/), [design/pages/_patterns.md](../../design/pages/_patterns.md), tokens and `tailwind.theme.ts`. **No hex** in specs or class lists. Enterprise ops console; WCAG AA; loading/empty/error/offline/denied; light+dark same names.

## Deliver

1. Audit (what exists)  
2. Token/theme deltas + files written  
3. Page specs for **in-scope screens only**  
4. Engineering follow-ups → Senior Software Architect next  

No feature logic, APIs, or ADRs. Cost: only screens in the BA slice.

**Token budget:** follow [.github/copilot-instructions.md](../copilot-instructions.md) § Token budget. Paths/Delta only in chat; write artifacts to files.
