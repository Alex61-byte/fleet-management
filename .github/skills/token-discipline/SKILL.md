---
name: token-discipline
description: "Use when: reduce token usage, cost, context bloat, slow/expensive agent runs, optimize copilot consumption, low token mode, lean handoffs."
user-invocable: true
---
# Token discipline

Apply [.github/copilot-instructions.md](../../copilot-instructions.md) **Token budget** section.

## Checklist (every turn)
1. Micro fix? → edit in place, no pipeline/subagents.
2. Need code map? → one **Explore quick** or grep — not full-file reads. **Never** `node_modules` / `.next` / `dist` / `.turbo` / `.expo`.
3. Subagent? → prompt ≤25 lines; require Paths/Delta/Decisions/Next; no doc paste back.
4. Docs? → write files; chat = IDs + links.
5. Verify? → targeted test name-pattern + typecheck touched pkgs only.
6. User reply? → ≤15 lines unless they asked for detail.

## Anti-patterns
- Full BA→FE for chevron/spacing/copy
- Re-reading stories/ADR already in thread
- Pasting `npm test` full output
- Parallel overlapping specialists
- Grep/read/`cat` under `node_modules` or build outputs
