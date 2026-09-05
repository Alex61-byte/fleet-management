---
name: tech-fix
description: "Diagnose and fix a technical issue (bug, breakage, misconfig, perf, wiring) via Architect then BE/FE. No new product behavior."
argument-hint: "Bug or technical issue (e.g. 401 on /v1/vehicles, mobile auth redirect loop)..."
agent: agent
---
# Technical fix — Architect → owners

This is a **purely technical** issue: no new product behavior, stories, or UI structure unless Architect flags scope expansion.

**Issue:** $ARGUMENTS

## Orchestration (mandatory)

Follow [.github/copilot-instructions.md](../copilot-instructions.md). **Auto-advance**. Do not pause for “next agent?”.

1. **Senior Software Architect** — root cause, approach, **owner: BE / FE / both** (and whether BA/Design/contracts must change). Recommend only; no drive-by product scope.
2. **Senior Backend Specialist** and/or **Senior Frontend Specialist** — implement exactly as Architect assigned.
3. If Architect flags product/UX/contract change → insert **Business Analyst** and/or **Design Specialist** only for that delta, then resume implementation.

Tiny obvious one-liners (typo, clear miswire, no design/contract judgment) may be fixed in place without Architect.

## Constraints

- Match existing repo patterns; smallest fix.
- Authz/tenancy stay on the API.
- Tests + typecheck for packages you touch.
- No speculative refactors outside the fix.

## Done when

Root cause is stated, fix is verified, and owners match Architect’s assignment (or explicit in-place micro-fix).
