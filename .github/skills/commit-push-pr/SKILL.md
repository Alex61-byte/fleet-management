---
name: commit-push-pr
description: "Commit staged work, push the branch, and open a pull request. Use when: commit and push, create PR, ship changes, git commit, open pull request, push branch, finish feature slice."
argument-hint: "Optional focus (e.g. 'vehicles compliance UI only')"
user-invocable: true
---

# Commit, push, and open a PR

Ship local work safely: review → commit → push → pull request. Do **not** force-push protected branches. Do **not** commit secrets.

## When to use

- User asks to commit, push, open a PR, or "ship" the current slice
- Feature/tech pipeline is done and changes should land on the remote
- User passes an optional focus (paths or topic) to narrow the commit

## Hard rules (non-negotiable)

| Rule | Detail |
| --- | --- |
| No secrets | Never stage `.env`, `.env.*` (except tracked `.env.example`), keys, tokens, credentials, or files that contain them |
| No force on default | Never `git push --force` / `--force-with-lease` to `main` or `master` |
| No empty commits | If there is nothing to commit after staging, stop and report clean/partial state |
| No rewrite of unrelated history | Do not amend unless HEAD commit was created by you in this conversation **and** has not been pushed |
| Explicit HEREDOC messages | Always create commits with a HEREDOC body so subject/body formatting is reliable |
| Push after commit | After a successful commit, push the current branch (auto-push). Then open or update a PR |

## Procedure

### 1. Inspect repository state

Run in parallel:

```bash
git status -sb
git remote -v
git branch -vv
git log -8 --oneline
git diff
git diff --cached
```

Note:

- Current branch and upstream tracking
- Whether `main`/`master` has no commits yet or remote ref is gone (bootstrap case)
- Untracked vs modified vs staged paths

### 2. Secret and safety scan

Before staging:

- Reject paths matching: `.env`, `.env.local`, `*.pem`, `*.p12`, `*credentials*`, `*secret*`, auth token files, private keys
- Allow `.env.example` only if it has placeholder values (no live secrets)
- If a secret-like file appears in `git status`, **leave it unstaged**, warn the user, and continue with safe files only
- Prefer respecting `.gitignore`; do not `git add -f` ignored secret files

### 3. Decide branch

| Situation | Action |
| --- | --- |
| Already on a feature branch | Keep it |
| On `main`/`master` with work to ship | **Stay on main** and commit there unless the user asked for a feature branch or a PR that requires one |
| User asked for a feature branch / topic branch | Create/switch to `feat/<short-topic>`, `fix/<short-topic>`, or `chore/<short-topic>` |
| Repo has **no commits yet** | First commit on `main` is fine; still scan secrets; push sets upstream |
| Detached HEAD | Stop; ask user to checkout a branch (do not invent recovery beyond stating the problem) |

Do **not** auto-branch off `main` just because a PR might follow. If opening a PR while on `main` and the default base is also `main`, warn that head and base are the same and either: push `main` only (no PR), or create a topic branch first **when the user wants a PR**. Branch names when needed: lowercase, hyphens, short (e.g. `feat/driver-invite-resend`).

### 4. Stage relevant changes

- Default: **one coherent commit** for the requested focus (or the clear primary change set)
- If user gave a focus (paths/topic): stage only matching paths; leave other WIP unstaged
- If status shows multiple unrelated concerns and no focus was given: stage the primary coherent unit only; list leftover WIP in the summary — do **not** split into multiple commits unless the user asks
- Use `git add -- <paths>` (path-specific). Avoid blind `git add .` when unsafe or unrelated files are present
- Re-run `git status -sb` and `git diff --cached` after staging

### 5. Summarize before commit (required)

Show a short summary in chat:

- Branch name
- Staged file list (names only)
- One-line intent of the change
- Unstaged/untracked left behind (if any)
- Confirmation that secrets were excluded

Then commit (user chose auto-push after success; no extra "confirm push" gate). If staging is empty because everything was unsafe/unrelated, **do not commit**.

### 6. Draft commit message

Style (match recent `git log` when history exists):

- Subject: imperative, ≤72 chars, no trailing period  
  Examples: `Add driver invite resend flow`, `Fix vehicle compliance date validation`
- Body (optional): why / scope bullets when the diff is non-trivial
- Focus on **why** and user-visible outcome; avoid noisy file laundry lists

Commit with HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
Subject line here

Optional body.
EOF
)"
```

On failure (`hooks`, empty commit): show error, fix if trivial (e.g. missing stage), do not force through hooks.

### 7. Push

```bash
git push -u origin HEAD
```

- First push of a branch: `-u` sets upstream
- Later pushes on same branch: `git push` is enough if upstream exists
- **Never** force-push `main`/`master`
- Force-with-lease on a **feature** branch only if user explicitly requested amend/rebase rewrite **and** branch is not default

If push fails (auth, non-fast-forward, missing remote): report the error and stop; do not rewrite history to "make push work" unless user asked.

### 8. Open or update a pull request

Prefer GitHub CLI when available:

```bash
gh pr view --json url,title,state 2>/dev/null
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...
EOF
)"
```

| Case | Action |
| --- | --- |
| No PR for branch | `gh pr create` against the **repo default branch** (resolve via `gh repo view --json defaultBranchRef` or remote HEAD; usually `main`) |
| Head branch is the default branch | Cannot open a useful PR; push only, or create a topic branch if the user wants a PR |
| PR already open | Push updates it; paste existing PR URL; do not open a duplicate |
| `gh` missing or unauthenticated | Print the compare URL: `https://github.com/<owner>/<repo>/compare/<default>...<head>?expand=1` with title/body the user can paste |

**PR title**: concise, same intent as commit subject (or broader if multiple commits).

**PR body** (markdown):

```markdown
## Summary
- Bullet outcomes (not every file)

## Test plan
- [ ] Commands or manual checks that validate the change
```

Include API/web/mobile checks when those packages changed. Keep it short.

### 9. Done criteria

Report:

- Commit hash and subject
- Branch name
- Remote push result
- PR URL (or compare URL fallback)
- Anything left unstaged

## Decision cheatsheet

```text
secrets in status?        → exclude + warn
on main?                  → commit on main OK (branch only if user asks)
mixed unrelated WIP?      → one commit for focus/primary; leave rest
nothing staged safe?      → stop, no commit
commit ok?                → push -u origin HEAD
PR wanted + on default?   → warn; push only or topic branch if user wants PR
gh available + not default head? → pr create (base = repo default) or reuse
else                      → compare URL
```

## Anti-patterns

- Committing `node_modules/`, build artifacts, or `.data/` when ignored
- `git add -A` then discovering `.env` in the commit
- Force-push to recover from rejected push on `main`
- Opening a second PR for the same branch
- Huge unrelated file dumps in the commit message
- Asking the user to "continue" between commit and push — run the full flow

## Optional argument

If the user supplies a focus string (paths or topic), narrow `git add` and message/PR title to that focus. Leave other local WIP untouched and list it in the final report.
