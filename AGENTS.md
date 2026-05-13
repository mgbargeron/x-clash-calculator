# AGENTS.md

## Purpose
Work only on the user's requested task.
Prefer the smallest correct change.

## Rules
- Do not scan or summarize the whole repository unless required.
- Read only files directly relevant to the task.
- Ask for clarification if the task is ambiguous.
- Prefer existing patterns over introducing new abstractions.
- Keep edits minimal, local, and reversible.
- Do not rename/move files unless necessary.
- Do not add dependencies unless explicitly justified.
- Do not make speculative cleanup changes.

## Workflow
1. Identify the exact files involved.
2. Inspect only the necessary code paths.
3. Make the minimal implementation change.
4. Verify impacted types/tests/build only if relevant.
5. Report what changed and any follow-ups.

## Code Style
- Match the existing style and architecture.
- Prefer clear names over clever code.
- Avoid overengineering.
- Keep functions/components focused.

## Performance for Agents
- Minimize file reads.
- Avoid repeated searches for the same symbol.
- Do not load large generated files, lockfiles, or build output unless needed.
- Ignore unrelated warnings/errors.
- Keep plans short and update them only when the task changes.

## Output
- Briefly state:
    - what changed
    - which files were touched
    - any risks or assumptions
- Do not include long explanations unless asked.