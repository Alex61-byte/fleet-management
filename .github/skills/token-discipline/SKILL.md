---
name: token-discipline
description: "Use when: reduce token usage, cost, context bloat, slow/expensive agent runs, optimize copilot consumption, low token mode, lean handoffs."
user-invocable: true
---
# Token discipline

Source of truth: [.github/copilot-instructions.md](../../copilot-instructions.md) **Token budget** (size tiers).

## Pick tier first
| Ask | Tier | Do |
| --- | --- | --- |
| commit / push / PR / branch / pull | **Commit** | Skill only; no docs, Explore, or pipeline |
| copy / spacing / one-liner | **Micro** | Edit in place; ≤3 reads |
| list filter/sort, badge, toolbar, pure SDK helper, FE on existing payload | **Small** | Minimal doc amend + direct FE/SDK edit; **no** BA/Design/Arch agents |
| new API / new flow / authz | **Full** | Pipeline; skip done stages |

## Checklist (every turn)
1. Tier set? If Commit/Micro/Small → **no** multi-specialist chain.
2. Paths known (session/summary/grep hit)? → **0** Explore.
3. Subagent only if blocked on Full/missing artifacts — prompt **≤15 lines**; return Paths/Delta only.
4. Docs: **amend** tail sections; never whole-file read of stories/rules/contracts.
5. Git: `status -sb` + `diff --stat` (+ ranged diff on stage paths). No full-tree diff by default.
6. Verify: one test file / name-pattern + tsc touched pkgs; `tail` output.
7. User reply: **≤12 lines**, links not dumps.

## Hard caps (Small feature)
- ≤1 grep batch, ≤5 ranged reads, ≤2 short doc patches, implement, ≤2 verify commands.
- **0** transcript reads; **0** `node_modules` / build dirs / `*.tsbuildinfo`.

## Anti-patterns (seen expensive)
- Full BA→Design→Arch→FE for client-only list chrome when `GET /v1/vehicles` already has fields
- Explore **and** broad greps **and** full page rewrites before editing known paths
- Commit flow that re-reads product docs or runs specialists
- Re-discovering prior-slice context after session summary already states it
- Parallel overlapping specialists; pasting test/tsc walls into chat
