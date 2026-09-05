# Fleet management — agent flow

Sources of truth (read only what the slice needs; do not paste wholesale into chat):
- Product: [docs/requirements.md](../docs/requirements.md), [docs/business-rules.md](../docs/business-rules.md), [docs/stories.md](../docs/stories.md)
- Design: [design/](../design/), [design/pages/_patterns.md](../design/pages/_patterns.md)
- Architecture: [docs/architecture.md](../docs/architecture.md), [docs/adr/](../docs/adr/), [docs/contracts/http-v1.md](../docs/contracts/http-v1.md)

## Stage order (do not skip)

1. **Business Analyst** — scope, rules, INVEST stories + Given/When/Then
2. **Design Specialist** — tokens + page specs (states, a11y, density)
3. **Senior Software Architect** — boundaries, contracts, ADRs (no app code)
4. **Senior Backend Specialist** — Fastify `/v1` against contracts
5. **Senior Frontend Specialist** — Expo / Next.js against BA + design + contracts

Backend before frontend. Never FE+BE in parallel on the same feature slice. Never invent stories, tokens, or contracts to keep coding.

## Reusable chat prompts (`.github/prompts/`)

Slash commands for repetitive agent entry points (type `/` in chat):

| Prompt | When |
| --- | --- |
| `/feature-slice` | New feature / behavior / UI structure — full BA→…→FE line |
| `/tech-fix` | Bug, breakage, misconfig, perf, wiring — Architect then owners |
| `/gap-fill-stage` | Missing stage artifacts; produce them and finish the line |
| `/ba-scope` | BA only |
| `/design-screens` | Design only |
| `/arch-review` | Architect only |
| `/be-implement` | Backend only |
| `/fe-implement` | Frontend only |

Prefer these over retyping handoff boilerplate. Orchestrator still auto-advances multi-stage prompts to completion.

## Run to completion (mandatory)

- **Do not ask the user to “continue” or approve the next agent** between stages.
- For a **new feature / behavior change / new UI structure**: run the full pipeline **from the first incomplete stage through implementation** (BA → Design → Architect → Backend → Frontend, skipping only stages already complete for that slice) in one orchestration pass until the slice is done or blocked by a real missing decision.
- For a **purely technical issue** (bug, breakage, misconfig, perf, wiring): **Architect proposes the fix** (root cause, approach, which layer owns it). Then **Backend and/or Frontend** implement as Architect assigned — no BA/Design unless Architect says product/UX/contract scope changed. Still run to completion without pausing for “next agent?”.
- Brief stage summaries are fine; **handoffs are automatic**. Only stop for: ambiguous product intent that BA cannot default, missing secrets/credentials only the user has, or destructive/irreversible ops that need explicit user consent.

## Routing

| Request | Do this |
| --- | --- |
| New feature / behavior change / new UI structure | Start at first incomplete stage (usually BA); **run all remaining stages to done** |
| Missing stage artifacts for a feature | Produce them via the right specialist, then continue the line — do not dump the gap on the user |
| Default / unspecified agent | Route by table below; still finish the work |
| Purely technical issue (no new product behavior) | **Architect** diagnoses + proposes solution and names **BE, FE, or both** → those agents fix; skip BA/Design unless scope expands |
| Tiny obvious bug (typo, clear one-liner, no design/contract/architecture judgment) | Fix in place; no Architect required. When unsure whether it is product vs technical → Architect (or BA if behavior is unclear) |
| API unchanged (e.g. static client-only) | Architect says so → Backend **no-op** → Frontend implements |

Stay in the **current specialist role per stage** (do not merge BA+Design+Architect+BE+FE into one undifferentiated blob). Orchestrator advances stages automatically until the request is complete.

### Technical vs feature

| Kind | Pipeline |
| --- | --- |
| **Feature** | BA → Design → Architect → BE → FE (full line; no skip; auto-advance) |
| **Technical** | Architect (propose) → BE and/or FE (fix as assigned). BA/Design only if Architect flags product/UX/contract change |

## Done when

| Stage | Done |
| --- | --- |
| BA | Actors, MoSCoW, rules, stories + AC |
| Design | Semantic tokens + page spec for in-scope screens |
| Architect | Recommended design + contracts BE/FE can implement; on technical issues: root cause, approach, **owner (BE / FE / both)** |
| Backend | Routes/events, error codes, tests (or explicit no-op) |
| Frontend | Screens on tokens/APIs with loading/empty/error |
| **Request** | Feature or technical fix is **fully implemented and verified** (tests/typecheck for touched packages), not merely handed off |

## Quality (non-negotiable)

- Match existing repo patterns; smallest vertical slice that meets AC.
- No hex or magic spacing in UI — use `design/` tokens and `themeClasses`.
- Authz and tenancy stay on the API; clients do not invent rules.
- Tests + typecheck for code you change. Fix what you break.
- No secrets in code or logs. No drive-by refactors outside the slice.

## Cost discipline (quality stays; tokens stay low)

- **Auto-advance stages** until the slice is done; do not burn a user turn per specialist.
- Prefer specialist subagents/handoffs over one mega-prompt that mixes roles — but **chain them** without waiting on the user.
- **Targeted context:** open only files for the slice. Prefer `grep`/symbols over whole-file dumps. Do not re-read docs already summarized in-thread.
- **Short outputs:** tables and bullets; link paths instead of pasting large specs. No essay restating the whole pipeline after every stage.
- If the thread is long or multi-topic, finish the **current** request first; suggest a fresh chat only for an **unrelated** next request — never as a substitute for completing the pipeline.
- **No paste of huge logs/terminals** into chat; quote the failing line/code only.
- **No speculative work:** no extra features, no CMS, no second framework, no “while I’m here” refactors.
- **No-op is success** when Architect says HTTP/UI surface is unchanged — do not invent routes or screens.
