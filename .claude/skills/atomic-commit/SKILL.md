---
name: atomic-commit
description: Atomic git commit workflow with gitmoji subjects and why-focused bullet bodies. Use this skill whenever the user asks to commit, stage changes, write commit messages, or clean up a messy working tree — including phrasings like "commit this", "make commits", "atomic commits", "split these changes", "write a commit message", or when the working tree has many unrelated changes that need to be grouped before committing. Also use after finishing a feature when the user wants commits before pushing.
---

# Atomic Commit

Turn an arbitrary working tree into a clean sequence of atomic commits. Each commit groups changes by **intent** (one logical reason for the change), uses a gitmoji subject, and has a body of bullets explaining **why**, not **what**.

The goal: a reader scanning `git log` understands the project's evolution from intents alone. The diff shows the what; the commit explains why it was worth doing.

## When this matters

Working trees accumulate unrelated work — config tweaks bundled with feature scaffolds, doc rewrites mixed with bugfixes, lockfile updates riding along with refactors. Committing it all as one blob destroys reviewability and bisectability. Atomic commits keep those signals alive.

Use this skill when:
- Working tree has 5+ modified/untracked files spanning multiple concerns
- User explicitly asks for "atomic", "scoped", "clean" commits
- Preparing a branch for PR review

## Flow

The flow is sequential. Each step depends on what the previous one revealed.

### 1. Survey the working tree

Run `git status` and `git diff --stat` to inventory everything. **Do not commit yet.** First understand the shape of what's there.

Group mentally by intent. Typical groupings:
- **Infra/config** — Docker, CI, lint config, tsconfig, env templates
- **Tooling/skills** — Editor settings, assistant configs, generated metadata
- **Docs** — Markdown under `docs/`, READMEs, RFCs
- **Service/module scaffold** — A coherent feature or layer landing as a unit
- **Tests** — Co-located specs, e2e suites, integration tests
- **Lockfile** — `bun.lock`, `package-lock.json`, `yarn.lock`, etc.
- **Generated files** — Route trees, OpenAPI clients, codegen output

A single commit may span multiple files **only if they share one reason**. A scaffold commit can touch many files because they all exist for the same purpose. An infra commit should not also rewrite docs.

### 2. Check for entanglement

Before staging, look for cases where changes from different intents touch the same file. Common cases:

- `package.json` has both new dep declarations (scaffold) and script renames (test reorg)
- A config file has unrelated reformatting bundled with semantic changes

When entanglement is unavoidable, **tell the user** and offer choices:
- Bundle into the larger commit (loses atomicity, gains simplicity)
- Split via `git add -p` (manual, interactive — confirm the user wants this)
- Defer the conflicting hunk for a later commit

Don't silently bundle. The user should know what's compromised.

### 3. Order the commits

Pick the sequence so each commit is **standalone valid** when possible — earlier commits don't reference code only introduced in later ones. Typical order:

1. Infra/config (foundation)
2. Tooling/skills (editor + assistant state)
3. Docs (no code dependencies)
4. Scaffold per service/module (each its own commit)
5. Tests for that scaffold (immediately after the code they test)
6. Frontend tooling → frontend feature → frontend wiring
7. Lockfile last (locks the full dep graph from prior commits)

Lockfile last because it depends on every `package.json` change that came before. Committing it first means it doesn't match the manifests yet at HEAD.

### 4. Stage path-explicit

Never use `git add -A` or `git add .`. Always name paths. This prevents accidentally committing secrets (`.env`), large binaries, or files outside the intended scope.

```bash
git add path/to/file1 path/to/dir/ another/file.ts
```

Directory paths are fine when the whole directory belongs to this commit. Verify with:

```bash
git diff --cached --name-status
```

If something snuck in that shouldn't, `git restore --staged <path>` before committing.

### 5. Write the message

See **Message format** below. Use a HEREDOC to preserve newlines:

```bash
git commit -m "$(cat <<'EOF'
:gitmoji: type(scope): short imperative subject

- Why bullet 1
- Why bullet 2
- Why bullet 3
EOF
)"
```

### 6. Repeat until clean

After each commit, re-run `git status`. Continue until working tree is clean. If a commit reveals new entanglement, address it in the next group.

## Message format

### Subject line

```
:gitmoji: type(scope): short imperative subject
```

- **Gitmoji** — one prefix from the table below, prefix form (`:sparkles:`), not unicode
- **type** — conventional commit type: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`
- **scope** — optional, the touched area: service name, layer, package
- **subject** — imperative mood, lowercase, no trailing period, ≤70 chars total

Example: `:sparkles: feat(games): implement game service with DDD and CQRS`

### Body bullets

Bullets explain **why** the change was worth making. Each bullet ties the change to a constraint, decision, or downstream effect.

Pattern: `<what the change enables or prevents> so <consequence the reader cares about>`

**Do:**
- "Push real-time state via a socket.io gateway behind a broadcaster interface so the orchestrator stays testable without a live server"
- "Loosen postgres/rabbitmq tags to major-only so security patches flow in without monthly version bumps"

**Don't:**
- "Added `GameGateway` class" — the diff already says this
- "Bumped dependencies" — no signal
- "Various improvements" — generic, drop it

If a bullet would just describe the diff in prose, delete it. The bullet earns its place by carrying a reason a reader couldn't recover from the code.

3-6 bullets is the sweet spot. Fewer means the commit is probably mechanical (one bullet is fine). More means the commit is doing too many things — consider splitting.

### Gitmoji table

| Gitmoji | When |
|---------|------|
| `:sparkles:` | New feature / new capability |
| `:bug:` | Bug fix |
| `:hammer:` | Infra/build/tooling change |
| `:wrench:` | Config or scaffolding tweak |
| `:white_check_mark:` | Adding or restructuring tests |
| `:memo:` | Documentation only |
| `:lock:` | Security-related (auth, deps lock, secrets handling) |
| `:art:` | Code structure / formatting / readability (no behavior change) |
| `:recycle:` | Refactor (behavior preserved) |
| `:wastebasket:` | Remove dead code / deprecated files |
| `:package:` | Dependency bump or lockfile |
| `:zap:` | Performance improvement |
| `:rotating_light:` | Lint/warning fixes |
| `:rewind:` | Revert |

When two emojis fit, pick the one matching the **primary** intent. A test reorg that touches configs is still `:white_check_mark:` because the reason for the commit is the tests.

## Worked example

A session produced these changes:
- Moved unit specs from `tests/unit/` to colocated `src/`
- Updated `vitest.config.ts` include/exclude globs
- Updated `package.json` test scripts
- Deleted old `.gitkeep` files

All four touch the test layout for the same reason. One commit:

```
:white_check_mark: test: colocate unit specs with source files

- Tests live next to source so code/spec pairs stay visible as the codebase grows
- Lowers maintenance cost when modules are renamed or moved — no orphan spec trees to chase
- Preserves tests/e2e and tests/integration for suites that depend on shared infra fixtures
- Vitest discovery and coverage globs cover both layouts so unit and integration boundaries stay separate
```

Notice: no bullet describes *what* was moved or *which* config keys changed — those are visible in the diff. Every bullet explains a reason.

## Anti-patterns

- **One mega-commit at end of session.** Loses bisectability. Split by intent during the session if possible.
- **Per-file commits.** Atomic ≠ tiny. A scaffold touching 40 files for one reason is still atomic.
- **Body that paraphrases the diff.** "Added X, modified Y, deleted Z" — useless. The diff is the source of truth for what.
- **Generic emojis (`:tada:`, `:rocket:`).** Use the semantic table above so logs stay scannable.
- **`git add -A` for speed.** Trades five seconds of typing for risk of leaking secrets or unrelated files.
- **Amending after pre-commit hook fail.** The commit didn't happen; `--amend` would modify the prior commit. Create a new commit instead.

## Edge cases

**Pre-existing uncommitted changes you didn't make.** Tell the user. Offer to commit only the parts you authored, or to scope freely across the whole tree. Don't silently sweep in work outside the session.

**Generated files (route trees, lockfiles, codegen).** Commit alongside the change that triggered the regeneration. If the regeneration spans multiple intent groups (e.g., lockfile after several package.json changes), commit it last as its own `:package:` or `:lock:` commit.

**File renames.** Git detects renames at log time, not commit time. Commit the rename and the import-path updates together so the diff stays coherent.

**Mixed formatter changes + semantic changes.** If a formatter touched the whole repo as a side effect of another commit, that's noise drowning the signal. Either revert the formatter changes in this commit and do a dedicated `:art:` commit, or note it explicitly in the body.

**LF/CRLF warnings on Windows.** Cosmetic. Git is normalizing line endings on stage. Safe to ignore unless `.gitattributes` is misconfigured.
