---
name: token-discipline
description: "Use when: reduce token usage, cost, context bloat, slow/expensive agent runs, optimize copilot consumption, low token mode, lean handoffs, long chat, session hygiene."
user-invocable: true
---
# Token discipline

Source of truth: [.github/copilot-instructions.md](../../copilot-instructions.md) **Token budget**.

**Bill ≈ input context** (always-on instructions + chat history + tool results), not how long the final reply looks.

## Pick tier first
| Ask | Tier | Do |
| --- | --- | --- |
| commit / push / PR / branch / pull | **Commit** | Skill only; no docs, Explore, pipeline, or product reads |
| copy / spacing / one-liner / CI assertion | **Micro** | Edit in place; ≤3 reads |
| list filter/sort, badge, toolbar, styled control, pure SDK helper, FE on existing payload | **Small** | Minimal doc amend + direct FE/SDK edit; **no** BA/Design/Arch agents |
| edit agents / skills / prompts / copilot-instructions | **Meta** | `.github/` only; no app/docs tour |
| new API / new flow / authz | **Full** | Pipeline; skip done stages |

## Session hygiene
- **One concern per chat.** After commit/push or verified done → **new chat** for the next unrelated ask.
- Do not stack git + feature + instruction edits + polish in one thread.
- Repair loops stay in-thread until fixed; then new chat if the next task differs.
- Prefer under-reading; never “read web and mobile for symmetry” unless asked.

## Checklist (every turn)
1. Tier set? Commit/Micro/Small/Meta → **no** multi-specialist chain.
2. Paths known (session/summary/grep hit)? → **0** Explore.
3. Subagent only if blocked on Full/missing artifacts — prompt **≤15 lines**; return Paths/Delta only.
4. Docs: **amend** tail sections; never whole-file read of stories/rules/contracts.
5. Git: `status -sb` + `diff --stat` (+ ranged diff on stage paths). No full-tree diff by default.
6. Verify: one test file / name-pattern + tsc touched pkgs; `tail` output.
7. User reply: **≤12 lines**, links not dumps.

## Hard caps
### Small feature
- ≤1 grep batch, ≤5 ranged reads, ≤2 short doc patches, implement, ≤2 verify commands.
- **0** transcript reads; **0** `node_modules` / build dirs / `*.tsbuildinfo`.

### Meta
- ≤5 ranged reads under `.github/` (and linked skill refs).
- **0** product docs/ADR/app exploration unless a single example path is required.

### Commit
- Skill steps only. **0** specialists, **0** Explore, **0** stories/design/ADR.

## Anti-patterns (seen expensive)
- One mega-session: custody + filter/sort + token-meta + select polish + many commits
- Full BA→Design→Arch→FE for client-only list chrome when payload fields already exist
- Explore **and** broad greps **and** full page rewrites before editing known paths
- Commit flow that re-reads product docs or runs specialists
- Instruction edits that tour the monorepo
- Re-discovering prior-slice context after session summary already states it
- Parallel overlapping specialists; pasting test/tsc walls into chat
- Reading both `apps/web` and `apps/mobile` when only one surface was requested
