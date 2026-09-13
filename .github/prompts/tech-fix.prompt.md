---
name: tech-fix
description: "Diagnose and fix a technical issue (bug, breakage, misconfig, perf, wiring) via Architect then BE/FE. No new product behavior."
argument-hint: "Bug or technical issue (e.g. 401 on /v1/vehicles, mobile auth redirect loop)..."
agent: agent
---
# Technical fix — Architect → owners

**Issue:** $ARGUMENTS

Follow [.github/copilot-instructions.md](../copilot-instructions.md). **Auto-advance. Token budget hard.**

1. **Micro first:** typo, layout break, chevron/spacing, clear miswire → fix in place (no Architect).
2. Else **Architect** — root cause, approach, owner BE/FE/both (≤15 lines). No product scope creep.
3. **BE and/or FE** implement assignment only.
4. Product/UX/contract change only if Architect flags → minimal BA/Design delta, then implement.

## Token rules
- **Micro first** (see copilot-instructions size tier)
- Grep/read failing file first; no monorepo tour; no Explore if path known
- Tests: pattern or file under test; tail -30
- User reply ≤10 lines: cause → fix path → verify

## Done
Root cause stated, fix verified, owners match assignment.
