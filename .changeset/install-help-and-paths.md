---
"@aaw/cli": patch
---

`aaw <command> --help` prints the help and does nothing else; `aaw install --help` used to run a real install in the current directory. The help now lists `--no-python`, `--seed`, `-y` and the `check-skills` flags. `aaw install` creates the work items folder where the config resolves it: `~`, `{tenant}` and `{repo}` expanded and a relative path taken from the workspace, so `--work-items-path ~/aaw/...` from PowerShell no longer creates a folder named `~` in the current directory. `aaw release` on an activity still `in_progress` now says what to do, instead of `Caller must call updateActivity ... does not hold the claim`.
