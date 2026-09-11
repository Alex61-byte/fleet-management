---
name: challenge-slice
description: "Adversarial bug-risk pass: Challenger → Architect triage → BE/FE fix → Challenger re-verify."
argument-hint: "Slice, paths, PR, or symptom (e.g. handovers authz, daily-usage gate)..."
agent: Challenger
---
# Challenge slice — find → triage → fix → re-verify

**Target:** $ARGUMENTS

Follow [.github/copilot-instructions.md](../copilot-instructions.md) and the **Challenger** agent. **Auto-advance. Token budget hard.**

## Pipeline (do not skip)

1. **Challenger** — adversarial analysis; findings table (ID, sev, trigger, evidence, likely owner). **No code edits.**
2. **Senior Software Architect** — triage findings: keep/drop, severity, approach, **owner BE/FE/both**. No app code.
3. **Senior Backend and/or Frontend Specialist** — fix **only** assigned IDs; tests for the risk; typecheck touched packages.
4. **Challenger** again — re-verify IDs → Fixed / still open / regressed. One loop unless user expands scope.

## Token rules

- Grep/read target paths first; no monorepo tour
- Tests: name-pattern or file under risk; tail failing lines only
- User reply per stage: **Paths · Delta · Decisions · Next** (≤5 each); findings as table

## Done

All P0/P1 Fixed or Architect **Accepted risk**; re-challenge clean or only P2/P3 residual listed.
