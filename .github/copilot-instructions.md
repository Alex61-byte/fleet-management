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
| `/challenge-slice` | Adversarial bug-risk pass — Challenger → Architect → BE/FE → Challenger re-verify |
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
| Bug-risk / challenge / pre-merge adversarial pass | Challenger → Architect triage → BE/FE → Challenger re-verify |
| Tiny obvious bug or UI polish | Fix in place; no pipeline |
| API unchanged (client-only) | Architect no-op BE → FE |

Stay in **current specialist role per stage**. Orchestrator auto-advances.

| Kind | Pipeline |
| --- | --- |
| **Feature** | BA → Design → Architect → BE → FE (skip complete stages only) |
| **Technical** | Architect → BE and/or FE |
| **Challenge** | Challenger → Architect triage → BE and/or FE fix → Challenger re-verify |
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
**Target:** micro/commit turns stay **small**; a localized list/UI feature must **not** cost a full multi-stage research epic. Prefer under-reading over over-reading.

### Size tier (pick one first — drives tools)

| Tier | Examples | Pipeline | Tools (soft caps) |
| --- | --- | --- | --- |
| **Commit / git** | commit, push, PR, checkout, pull, branch | **None** — only [commit-push-pr](skills/commit-push-pr/SKILL.md) / [create-branch](skills/create-branch/SKILL.md) | `status -sb`, `diff --stat`, `log -5 --oneline`; **no** Explore/subagents; **no** full `git diff` unless staging is unclear |
| **Micro** | spacing, copy, chevron, one-liner bug, obvious miswire | In-place edit only | ≤3 file reads; 0 subagents; 1 targeted test if behavior changed |
| **Small feature** | client filter/sort on existing list; badge; toolbar; SDK pure helper; BE no-op + FE | **Skip** BA/Design/Arch **subagents**. Orchestrator: **minimal amend** stories/rules/design (or 1 short ADR if contract policy changes) → implement → verify | ≤1 grep batch + ≤5 ranged reads; **0** Explore unless paths unknown; **0–1** specialist only if blocked; no transcript replay |
| **Full slice** | new API surface, new screen flow, authz model, multi-entity behavior | BA→…→FE but **skip complete stages** (1-path spot-check) | Subagents only for incomplete stages; prompts ≤15 lines |

If unsure between **Small** and **Full**: choose **Small** when data already on the wire (e.g. `open_out`, dates on `GET /v1/vehicles`) and UI is additive chrome.

### Orchestrator
- **Commit/git requests:** never open product docs, never run feature pipeline, never “review the whole slice” unless user asked for a challenge/PR description beyond skill defaults.
- **One** path discovery max: grep **or** Explore **quick** — never both, never Explore for commit/micro.
- Subagent prompts: **≤15 lines** (paths + acceptance only). Forbid “read all docs” / “explore broadly”.
- Subagent → user: **≤10 lines** per stage (Paths/Delta only). **Never** paste subagent dumps, ADR bodies, contracts, or tool logs into chat.
- **Never** re-read a file already in this turn’s context or session summary; trust handoff notes.
- **Never** load conversation transcripts to “recover” code you can `read` from the repo.
- Skip stages with existing stories/design/ADR/contract (spot-check **1** path). Prefer **amend** over new US/ADR when extending a just-shipped slice.
- Prefer **direct orchestrator edits** for Small feature + all Micro. Specialists only when stage artifacts are missing **and** non-trivial.
- Parallel subagents **only** if independent after BA lock. **Never** BA‖Design‖BE.
- User reply: **≤12 lines** — what/where/verify. No pipeline recap.

### Context loading
- `grep` + **ranged** `read` only; default read ≤80 lines unless editing that file.
- Docs: append/amend **end sections** only — do not read whole `stories.md` / `business-rules.md` / `http-v1.md`.
- Terminal: `tail -30` tests; chat gets **fail lines / exit codes** only.
- Git: `diff --stat` first; full diff **only** for paths you will stage, and only if stat is ambiguous.
- **Never** touch: `node_modules/`, `.next/`, `dist/`, `coverage/`, `.turbo/`, `.expo/`, lockfile bodies, `*.tsbuildinfo`.

### Subagent / specialist
- Return: `Paths` · `Delta` · `Decisions` · `Next` (≤3 bullets each).
- Write to **repo files**; chat = pointers.
- Thoroughness **quick**; one escalate max.
- No completed ADR/story regenerations.

### Forbidden waste
- Full BA→FE (or Design+Arch subagents) for **Small feature** / polish / commit.
- Explore + multi-file doc tour before a single known edit path.
- Re-running pipeline after merge to add list chrome on the same surface.
- Pasting npm/tsc full logs; re-typechecking packages you did not touch.
- Speculative features, drive-by refactors, second frameworks.
- Fresh chat mid-slice if it forces re-discovery — finish first.

### Verify cheaply
- One test file or `--test-name-pattern` for the slice; typecheck **touched packages only**.
- Ship/PR: still no monorepo-wide suite unless user asks or prior slice failures.
