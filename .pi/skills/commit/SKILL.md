---
name: commit
description: |
  Create a git commit following the project's Conventional Commits + Gitmoji +
  Issue Tracking format. Analyzes staged/unstaged changes, drafts the message,
  and commits. Triggers: "commit", "git commit", "commit changes", "commit my
  changes". Issue code is auto-extracted from the current branch name.
version: 1.0.0
user-invocable: true
argument-hint: "[optional message hint]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
routing:
  triggers:
    - commit
    - git commit
    - commit changes
    - commit my changes
  category: git-workflow
---

# /commit - Conventional Commit with Gitmoji + Issue Tracking

## Format

```
:<emoji>: <type>(<scope>): <description>

<optional body>

<ISSUE-CODE>
```

## Emoji → Type Reference

| Emoji         | Type       | When                                |
| ------------- | ---------- | ----------------------------------- |
| `:sparkles:`  | `feat`     | New functionality                   |
| `:bug:`       | `fix`      | Bug fix                             |
| `:recycle:`   | `refactor` | Refactoring without behavior change |
| `:memo:`      | `docs`     | Documentation                       |
| `:test_tube:` | `test`     | Tests                               |
| `:arrow_up:`  | `chore`    | Dependencies / build config         |
| `:zap:`       | `perf`     | Performance improvement             |
| `:fire:`      | `refactor` | Removing code/files                 |
| `:lock:`      | `security` | Security fix                        |
| `:rocket:`    | `deploy`   | Deployment changes                  |

---

## Instructions

### Phase 1: GATHER

**Step 1: Check working tree**

```bash
git status
git diff --staged
git diff
```

If nothing to commit → tell the user and stop.

**Step 2: Extract issue code from branch**

```bash
git branch --show-current
```

Pattern: match `[A-Z]+-[0-9]+` in the branch name.
Examples: `feature/DGDNS-287` → `DGDNS-287`, `feature/PROJ-123-foo` → `PROJ-123`.
If no match, omit the issue line.

**GATE**: Changes exist and issue code (if any) is extracted.

---

### Phase 2: DRAFT

**Step 1: Analyze the diff**

Read `git diff --staged` (or `git diff` if nothing staged) to understand what changed.

**Step 2: Choose type + emoji**

Pick from the table above. When multiple types fit, prefer the dominant change.

**Step 3: Choose scope**

Lowercase domain word: `billing`, `auth`, `dns`, `profile`, `device`, `account`, `cache`, `api`, `docs`, etc.
If the user provided a hint (skill argument), incorporate it.

**Step 4: Write description**

- Imperative mood: "add", not "added" or "adds"
- Starts lowercase
- No trailing period
- Max ~72 chars on the first line

**Step 5: Decide on body**

Include a body only when:

- Multiple related changes need explanation
- Non-obvious implementation choices were made
- Breaking changes are present

Separate body from subject with a blank line and hyphen at start. Body explains **why**, not what.

**Step 6: Assemble the message**

```
:<emoji>: <type>(<scope>): <description>

<optional body>

<ISSUE-CODE>
```

Present the drafted message to the user for review before committing.

**GATE**: Message follows format; user approves (or has auto-approved via argument).

---

### Phase 3: COMMIT

**Step 1: Stage if needed**

If changes are unstaged, ask the user which files to stage — or stage all with `git add -A` only if the user confirms.

**Step 2: Run the commit**

```bash
git commit -m "$(cat <<'EOF'
:<emoji>: <type>(<scope>): <description>

<optional body>

<ISSUE-CODE>
EOF
)"
```

**Step 3: Confirm**

```bash
git log -1 --oneline
```

Display the result to the user.

**GATE**: Commit succeeded.

---

## Checklist (verify before committing)

- [ ] Emoji matches commit type
- [ ] Type is one of: feat / fix / refactor / docs / test / chore / perf / security / deploy
- [ ] Scope is lowercase and domain-focused
- [ ] Description is imperative, lowercase start, no trailing period
- [ ] Issue code is on the **last line** (blank line before it)
- [ ] Body (if present) is separated by a blank line and explains _why_

---

## Examples

**Simple feature**

```
:sparkles: feat(billing): add subscription tier support

DGDNS-287
```

**Bug fix with body**

```
:bug: fix(auth): prevent race condition in token refresh

- Add mutex lock to ensure only one token refresh happens at a time.
- Fixes concurrent requests causing invalid token state.

DGDNS-287
```

**Docs-only change**

```
:memo: docs(api): update swagger annotations for billing endpoints

DGDNS-287
```
