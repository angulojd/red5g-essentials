---
name: audit
description: "Run code quality audit on Python files. Delegates to the code-auditor agent."
---

Run a code quality audit on the specified Python files.

## Usage

```
/rg:audit <file_or_folder>
```

## Behavior

1. If a `.py` file is passed, audit only that file.
2. If a folder is passed, audit all `.py` files inside it.
3. If no argument is passed, audit all `.py` files modified in git (`git diff --name-only --diff-filter=ACMR HEAD`).

## Execution

Delegate to the `code-auditor` agent with the identified files. The agent produces a structured report with a commit verdict.

**Instruction:** Invoke the `code-auditor` agent with the files the user specified. If no files were specified, first run `git diff --name-only --diff-filter=ACMR HEAD` to get the modified `.py` files, then pass them to the agent.
