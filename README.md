# red5g-essentials

Enterprise Python backend standards for serverless AWS projects.

## What's Included

| Component | Purpose |
|-----------|---------|
| `agents/code-auditor.md` | 7-pillar code quality auditor (KISS, SOLID, PEP 8, Docstrings, Security, Guard Clauses, Error Handling) |
| `agents/git-flow.md` | Git Flow automation (branching, merging, releases, PRs) |
| `skills/python-standards.md` | Global coding rules auto-injected for all `.py` files |
| `skills/workflow-guide.md` | How to use OpenSpec + Essentials + Beads together |
| `hooks/ruff-gate.py` | PostToolUse hook that blocks writes if ruff check/format fails |
| `commands/audit.md` | `/audit` shortcut to run code-auditor on modified files |
| `scripts/setup.sh` | One-command project initialization |

## Install

### Plugin (once per developer)

```bash
# In Claude Code:
/plugin marketplace add red5g/red5g-essentials
/plugin install red5g-essentials
```

### New Project Setup

```bash
cd my-new-project
git init
curl -fsSL https://raw.githubusercontent.com/red5g/red5g-essentials/main/scripts/setup.sh | bash
```

This installs OpenSpec, Beads, ruff, creates the project structure, and generates a CLAUDE.md template to edit.

## Usage

### Quick task (80% of work)
```
/implement-loop fix the auth bug
```

### Feature with plan
```
/plan-creator Add JWT authentication
/plan-loop .claude/plans/jwt-auth-plan.md
```

### Feature with specs + persistent memory
```
/opsx:propose add-authentication
/plan-creator Add authentication
/beads-converter .claude/plans/auth-plan.md
/beads-loop
/opsx:archive
```

### Code audit
```
/audit src/services/auth.py
/audit src/services/
/audit                        # audits git-modified .py files
```

## Code Standards Enforced

- **PEP 8** with configurable line-length (reads pyproject.toml, default 100)
- **Strict typing** on all functions (params + return)
- **Pydantic v2** for I/O validation, **pydantic-settings** for config
- **English code** / **Spanish docstrings** / **Spanish logs**
- **SOLID principles** (SRP, Open/Closed, Dependency Inversion)
- **Security**: no hardcoded credentials, no os.environ outside config.py, no print()
- **Guard clauses** over nested if/else
- **Structured logging** with context (request_id, user_id)
- **Specific exceptions**, no bare except
- **100 lines max** per function, **400 max** per file
- **Conventional Commits** with Git Flow branching

## Requirements

| Tool | Required? | Purpose |
|------|-----------|---------|
| ruff | Yes | Linting + formatting gate |
| OpenSpec | Recommended | Spec-driven planning |
| Essentials plugin | Recommended | Loops, swarms, teams with exit criteria |
| Beads | Optional | Persistent memory across sessions |
| tmux | Optional | Only for `/plan-team` mode |

## License

MIT
