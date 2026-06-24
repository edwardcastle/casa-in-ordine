@AGENTS.md

## Git Commit Conventions

Use this format:

```
[<type>] <short summary>

<body explaining what and why>

<footer: references, breaking changes>
```

Rules:
- Summary line in imperative mood ("Add feature", not "Added"/"Adds"), capitalized, no trailing period, max 50 chars
- Make summaries specific ("Fix null check in login handler", not "Fix bug")
- Body explains WHY, not how; wrap at ~72 chars; omit for trivial changes
- One logical/atomic change per commit
- Reference issues in the footer (e.g. "Closes #123")
- Mark breaking changes with "BREAKING CHANGE: <description>"
- Never use vague messages like "wip", "fixes", "updates"
- Do NOT add any Claude references, co-author lines, or "Generated with Claude Code" footers to commit messages

Allowed types: feat, fix, docs, refactor, test, chore

Examples:

```
[feat] add user authentication
[fix] correct timezone offset in reports
[docs] update API examples
[refactor] extract validation logic
[test] add cases for edge inputs
[chore] bump dependencies
```
