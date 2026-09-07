---
name: create-branch
description: "Create a new git topic branch from the up-to-date default branch and push it with upstream. Use when: create branch, new branch, checkout -b, start feature branch, git branch from main, switch to feature branch."
argument-hint: "Branch topic or full name (e.g. 'driver invite resend' or 'feat/driver-invite-resend')"
user-invocable: true
---

# Create branch

Start work on a **new topic branch** that shares history with the repo default branch (`main`), then **push and set upstream**. Does **not** commit or open a PR (use `commit-push-pr` for that).

## When to use

- User asks to create/switch to a new branch
- Starting a feature, fix, or chore before coding
- Avoiding commits directly on `main` when a PR is expected later
- Argument: short topic (`driver invite`) or full name (`feat/driver-invite-resend`)

## Hard rules

| Rule | Detail |
| --- | --- |
| Shared history | Never create a root commit branch when `origin/<default>` already exists — always branch from that tip (prevents GitHub “entirely different commit histories”) |
| Fresh base | `git fetch` first; create from `origin/<default>`, not a stale local default |
| No force on default | Never force-push `main`/`master` |
| No commit here | Do not stage/commit unless the user also asked to ship (hand off to `commit-push-pr`) |
| Clean rename | Branch names: lowercase, hyphens, slash prefix; no spaces or uppercase |

## Procedure

### 1. Inspect state

```bash
git status -sb
git remote -v
git branch -vv
git rev-parse --abbrev-ref HEAD
```

Note:

- Uncommitted changes (modified/staged/untracked)
- Current branch vs default
- Whether a branch with the target name already exists locally or on remote

### 2. Resolve default base branch

```bash
git fetch origin
```

Default branch (prefer in order):

1. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` when `gh` works
2. `git symbolic-ref refs/remotes/origin/HEAD` → e.g. `origin/main`
3. Fallback: `main`, then `master`

Call the resolved name `<default>` (usually `main`).

Ensure `origin/<default>` exists after fetch. If the remote default is missing or the repo has **no commits on remote**, say so and stop or follow user guidance — do not invent an unrelated root.

### 3. Handle local work in progress

| Working tree | Action |
| --- | --- |
| Clean | Continue |
| Dirty, switch is safe | `git switch`/`checkout -b` keeps uncommitted files; continue and report that WIP came along |
| Dirty and switch blocked (conflict risk) | Stop; list blocking files; do not `git stash` unless the user asked to stash |
| User wanted a clean branch from default only | Warn that uncommitted files will move with the checkout; continue unless blocked |

Do **not** discard user changes.

### 4. Name the branch

If the user gave a full name matching `^(feat|fix|chore|docs|refactor|test|ci)/[a-z0-9]+([a-z0-9-]*)$`, use it.

Otherwise build from the topic argument (or diff/context if they only said “new branch”):

| Intent | Prefix |
| --- | --- |
| New feature / product slice | `feat/` |
| Bug / breakage | `fix/` |
| Tooling, skills, deps, meta | `chore/` |
| Docs only | `docs/` |

Slug rules:

- lowercase
- spaces → `-`
- strip punctuation except `-`
- collapse multiple `-`
- keep short (≈3–6 words)

Examples: `feat/driver-invite-resend`, `fix/vehicle-compliance-date`, `chore/create-branch-skill`

If the name already exists:

| Exists | Action |
| --- | --- |
| Local branch, same tip intent | Check it out; fetch/push upstream if needed; do **not** recreate |
| Local branch, user wanted fresh from default | Stop and ask, or use a numeric/suffix name only if user allows |
| Remote-only | `git switch -c <name> --track origin/<name>` (or set upstream after checkout) |

### 5. Create from up-to-date default

Preferred (detached from stale local `main` is fine):

```bash
git switch -c <name> origin/<default>
```

Equivalent:

```bash
git checkout -b <name> origin/<default>
```

If already on an up-to-date local `<default>` that matches `origin/<default>`:

```bash
git switch -c <name>
```

**Do not** use `git checkout -b <name>` from a random feature branch unless the user explicitly wants to stack on that branch.

Stacked branch (only if user says “from current” / “stack on this”):

```bash
git switch -c <name>
```

…from current HEAD, and note base in the summary.

### 6. Push and set upstream (default)

```bash
git push -u origin HEAD
```

- Creates the remote branch and tracks it
- Do **not** force-push
- If push fails (auth, network, protected rules): report error; leave local branch in place

### 7. Done criteria

Report in chat:

- Branch name
- Base: `origin/<default>` @ short SHA
- Upstream: `origin/<name>` (or push failure)
- Whether uncommitted WIP carried over
- Next step hint: implement work, then `/commit-push-pr` when ready

## Decision cheatsheet

```text
fetch origin
resolve default branch
name = user full name OR prefix/slug(topic)
dirty & blocked?     → stop, do not destroy WIP
branch exists?       → switch/track, don't duplicate
git switch -c name origin/<default>
git push -u origin HEAD
summarize
```

## Anti-patterns

- Branching from empty local state as a **second root commit** while `origin/main` already has commits → GitHub unrelated histories / “nothing to compare”
- Creating from stale local `main` without `git fetch`
- Branching off an old feature branch by accident
- Force-pushing to create the branch
- Committing or opening a PR inside this skill unless the user explicitly combined requests
- Names like `Feat/My Branch` or `new-branch` with no topic

## Relationship to other skills

| Skill | Role |
| --- | --- |
| **create-branch** (this) | New branch from default + push `-u` |
| **commit-push-pr** | Stage, commit, push, PR on the **current** branch |

If the user says “new branch and commit/push/PR”, run **create-branch** first, then **commit-push-pr**.

## Optional argument

- Topic or full branch name only — no commit message handling here.
- If no argument: derive a short slug from the user’s stated task in the same message; if still unclear, ask for a one-line topic before creating.
