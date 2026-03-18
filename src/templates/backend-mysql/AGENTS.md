# Agent Instructions

This project uses `bd` (Beads) for task tracking across sessions.

## Session Start
1. Run `bd ready --json` to see available tasks
2. Claim a task: `bd update <id> --claim`

## During Work
3. Implement, test, audit with `code-auditor`
4. Discover new work: `bd create "<description>" -t <type> -p <priority>`

## Session End
5. Close completed tasks: `bd close <id> --reason "<description>"`
6. Run `bd sync` to push state to git
