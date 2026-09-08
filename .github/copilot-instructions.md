# Fleet management — agent flow

Sources of truth (**open only slice-needed sections**; never paste wholesale into chat):
- Product: [docs/requirements.md](../docs/requirements.md), [docs/business-rules.md](../docs/business-rules.md), [docs/stories.md](../docs/stories.md)
- Design: [design/](../design/), [design/pages/_patterns.md](../design/pages/_patterns.md)
- Architecture: [docs/architecture.md](../docs/architecture.md), [docs/adr/](../docs/adr/), [docs/contracts/http-v1.md](../docs/contracts/http-v1.md)

## Stage order (do not skip *when incomplete*)

1. **Business Analyst** — scope, rules, INVEST + Given/When/Then
2. **Design Specialist** — tokens + page specs (states, a11y, density)
3. **Senior Software Architect** — boundaries, contracts, ADRs (no app code)
4. **Senior Backend Specialist** — Fastify `/v1` against contracts
5. **Senior Frontend Specialist** — Expo / Next.js against BA + design + contracts

Backend before frontend. Never FE+BE in parallel on the **same** feature slice. Never invent stories, tokens, or contracts to keep coding.

## Reusable chat prompts (`.github/prompts/`)

| Prompt | When |
| --- | --- |
| `/feature-slice` | New feature / behavior / UI structure — full BA→…→FE |
| `/tech-fix` | Bug, breakage, misconfig, perf, wiring — Architect then owners |
| `/gap-fill-stage` | Missing stage artifacts; produce them and finish |
| `/ba-scope` `/design-screens` `/arch-review` `/be-implement` `/fe-implement` | Single stage only |

Prefer slash prompts over retyping boilerplate. Orchestrator auto-advances multi-stage work to completion.

## Run to completion (mandatory)

- Do **not** ask the user to continue between stages.
- **Feature / behavior / new UI structure:** first incomplete stage → implement → verified.
- **Technical only:** Architect → BE and/or FE (skip BA/Design unless scope expands).
- **Tiny polish** (spacing, copy, chevron size, obvious one-liner): fix in place — **no** BA/Design/Architect/subagent chain.
- Stop only for: product ambiguity BA cannot default, user-only secrets, destructive ops needing consent.

## Routing

| Request | Do this |
| --- | --- |
| New feature / behavior / new UI structure | First incomplete stage → remaining line to done |
| Missing stage artifacts | Produce via specialist, continue line |
| Pure technical | Architect → BE/FE owners |
| Tiny obvious bug or UI polish | Fix in place; no pipeline |
| API unchanged (client-only) | Architect no-op BE → FE |

Stay in **current specialist role per stage**. Orchestrator auto-advances.

| Kind | Pipeline |
| --- | --- |
| **Feature** | BA → Design → Architect → BE → FE (skip complete stages only) |
| **Technical** | Architect → BE and/or FE |
| **Micro** | In-place fix |

## Done when

| Stage | Done |
| --- | --- |
| BA | Actors, MoSCoW, rules, stories + AC |
| Design | Semantic tokens + page spec (in-scope screens) |
| Architect | Design + contracts; tech issues: root cause, approach, **owner** |
| Backend | Routes/events, errors, tests (or explicit no-op) |
| Frontend | Screens on tokens/APIs with loading/empty/error |
| **Request** | Implemented **and** verified (tests/typecheck touched packages) |

## Quality (non-negotiable)

- Smallest vertical slice; match repo patterns.
- No hex/magic spacing — `design/` tokens + `themeClasses`.
- Authz/tenancy on API only.
- Tests + typecheck for code you change. Fix what you break.
- No secrets. No drive-by refactors outside the slice.

## Token budget (hard — quality stays, usage stays low)

**Default posture: minimum context, minimum prose, maximum file edits.**

### Orchestrator
- **One Explore (quick)** *or* grep before any specialist if you lack paths — not both full dumps.
- Subagent prompts: **≤25 lines**, include paths + acceptance only; forbid “read all docs”.
- Subagent returns: treat as **handoff notes**, not chat essays — **≤20 lines** summary to user per stage (table/bullets + path links).
- **Never** paste subagent full dumps, ADR bodies, or contracts into the user thread.
- **Never** re-read a file already summarized this turn; use session memory or prior notes.
- Skip stages with **existing** stories/design/ADR/contract for the slice (spot-check 1 path, don’t re-run BA).
- Parallel subagents **only** when work is independent (e.g. Design ‖ Architect after BA locked). **Never** BA‖Design‖BE together.
- Prefer **direct edits** over subagents for micro fixes and for FE/BE when contracts already exist and the change is localized.
- User-facing replies: **short** — what changed, where to look, verify one-liner. No pipeline restatements.

### Context loading
- Prefer `grep`/path-targeted `read` with **line ranges** over whole files.
- Docs: read **delta sections** only (new US/rules/ADR), not entire `stories.md`.
- Terminal: `tail` tests; quote **failing lines only**. No full build logs in chat.
- Diffs: `git diff --stat` first; full diff only for files you edit.
- **Never** search, read, open, or attach: `node_modules/`, `.next/`, `dist/`, `coverage/`, `.turbo/`, `.expo/`, lockfile bodies, `*.tsbuildinfo`. Use app/package source only.

### Subagent / specialist
- Return format mandatory: `Paths` · `Delta` · `Decisions` · `Next` (each ≤5 bullets).
- Write artifacts to **repo files**; chat = pointers.
- Cap exploration **thoroughness: quick** unless blocked; escalate once.
- Do not regenerate completed ADRs/stories; **amend** minimally.

### Forbidden waste
- Touching or indexing **`node_modules`** (or other exclude dirs above) for any reason.
- Mega-prompts mixing BA+Design+Arch+BE+FE in one agent call when stages need isolation — **except** micro in-place fixes.
- Re-running the full feature pipeline for polish, chevron, copy, or “can’t see UI” layout bugs (use tech/micro path).
- Speculative features, second frameworks, “while I’m here”.
- Inventing routes/screens when Architect said **no-op**.
- Fresh chat mid-slice to “save tokens” if it forces re-discovery — finish current request first; fresh chat only for **unrelated** next work.

### Verify cheaply
- Test **name-pattern** or single file tests for the slice first; full workspace suite only before ship/PR.
- Typecheck only packages touched.
