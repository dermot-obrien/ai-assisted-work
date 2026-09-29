# Quick start

From nothing to a work item you can list, check, claim and hand to an agent, in about ten
minutes. You make a throwaway workspace, install AAW into it, add one small work item, and
drive it from the shell. The last steps open it in your agent and, optionally, try the
`thread` skill against a scratch store.

Every command below was run on Windows in PowerShell 5.1 and in Git Bash. Where the two
differ, both are shown; everywhere else one command works in both.

## What you need

- Node.js 18 or newer (20 or newer recommended)
- git
- Optionally, an agent that reads Agent Skills: VS Code with GitHub Copilot, Cursor, Claude
  Code, Codex or Gemini CLI

```
node --version
git --version
```

You should see `v18` or later, and any recent git.

## 1. Make a scratch workspace

```
mkdir aaw-demo
cd aaw-demo
git init
```

AAW installs into a workspace, which is usually a git repository. This one is disposable.
PowerShell prints a table for the new folder; git prints `Initialized empty Git repository`.

If you use Claude Code, also run `mkdir .claude` now. Claude Code reads skills only from
`.claude/skills/`, and the installer links that folder only when `.claude/` already exists.

## 2. Clone AAW into it

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
```

The clone holds the skills and a self-contained CLI, `bin/aaw.js`, that needs no
`npm install`.

## 3. Install

```
node .ai-assisted-work/bin/aaw.js install --yes --tenant demo --work-items-path ./work-items
```

`--yes` answers every question from the flags or the defaults, so nothing is asked. Without
it, in a terminal, the installer asks for the workspace, tenant, mode and work items folder.
The work items folder normally lives outside the repository, under `~/aaw/`; this quick
start keeps it inside the scratch workspace so there is nothing to clean up elsewhere.

You should see, among other lines (on macOS and Linux the paths use `/`):

```
▸ Non-interactive: tenant=demo, mode=local-fs, work_items_path=./work-items
...
▸ Installing AI-Assisted Work (aaw@3.2.0)
  ▸ skills: installed 6 → .agents\skills/
      aaw-next-task, aaw-progress-work, aaw-start-initiative, aaw-start-work, aaw-work-status, thread
...
Done. Try this in your AI tool:
    /aaw-start-work add a new feature
```

With `.claude/` present there is one more line, `▸ claude: linked 6 → .claude\skills/`.
The workspace now has `.aaw-config.yaml`, the skills in `.agents/skills/`, and an empty
`work-items/` folder.

## 4. Check the install

```
node .ai-assisted-work/bin/aaw.js verify
node .ai-assisted-work/bin/aaw.js check-skills
```

`verify` ends with `All checks passed.`, and its last check reads
`Backend list  —  0 work item(s) found`. `check-skills` lists each skill as `ok` and ends
with `Every installed skill matches the framework that owns it.`

## 5. Add a tiny work item

A work item is a folder named `WI-NNN-<slug>` holding a `progress.yaml`. An agent writes
these for you with `/aaw-start-work`; here you write a small one by hand so there is
something to drive. It names one product (a deliverable) and two activities that produce
it: one for an agent, and one for a human that waits on the first.

PowerShell:

```powershell
New-Item -ItemType Directory -Force work-items/WI-001-onboarding-checklist | Out-Null
@'
schema_version: 3
version: 1
work_item_id: WI-001
title: "Onboarding checklist"
type: mixed
status: in_progress
work_item_level: epic
deliverables:
  - id: WI-001-D1
    name: "Onboarding checklist for new team members"
    why_needed: "New starters ask the same questions every week"
    quality_criteria: "A new starter can finish day one without asking for help"
    state: planned
activities:
  - id: WI-001-A1
    title: "Draft the checklist"
    produces: WI-001-D1
    status: pending
    actor: agent
    depends_on: []
    tasks:
      - id: WI-001-A1-T1
        title: "List the day-one steps"
        status: pending
        actor: agent
  - id: WI-001-A2
    title: "Review the checklist with a recent starter"
    produces: WI-001-D1
    status: pending
    actor: human
    depends_on: [WI-001-A1]
    tasks:
      - id: WI-001-A2-T1
        title: "Walk through it with a recent starter"
        status: pending
        actor: human
'@ | Set-Content -Encoding utf8 work-items/WI-001-onboarding-checklist/progress.yaml
```

bash:

```bash
mkdir -p work-items/WI-001-onboarding-checklist
cat > work-items/WI-001-onboarding-checklist/progress.yaml <<'EOF'
schema_version: 3
version: 1
work_item_id: WI-001
title: "Onboarding checklist"
type: mixed
status: in_progress
work_item_level: epic
deliverables:
  - id: WI-001-D1
    name: "Onboarding checklist for new team members"
    why_needed: "New starters ask the same questions every week"
    quality_criteria: "A new starter can finish day one without asking for help"
    state: planned
activities:
  - id: WI-001-A1
    title: "Draft the checklist"
    produces: WI-001-D1
    status: pending
    actor: agent
    depends_on: []
    tasks:
      - id: WI-001-A1-T1
        title: "List the day-one steps"
        status: pending
        actor: agent
  - id: WI-001-A2
    title: "Review the checklist with a recent starter"
    produces: WI-001-D1
    status: pending
    actor: human
    depends_on: [WI-001-A1]
    tasks:
      - id: WI-001-A2-T1
        title: "Walk through it with a recent starter"
        status: pending
        actor: human
EOF
```

The full template, with every field explained, is
[skills/aaw-start-work/assets/templates/progress.yaml](../skills/aaw-start-work/assets/templates/progress.yaml).

## 6. Read it back

```
node .ai-assisted-work/bin/aaw.js status
node .ai-assisted-work/bin/aaw.js status WI-001
node .ai-assisted-work/bin/aaw.js lint
node .ai-assisted-work/bin/aaw.js next-task WI-001
```

You should see:

```
Work items in ...\aaw-demo\work-items:
  → WI-001 — Onboarding checklist (in_progress, 0/2 activities done)

WI-001 — Onboarding checklist
  type: mixed, status: in_progress
  initiative: none
  version: 1

  ○ WI-001-A1 — Draft the checklist (pending)
      ○ WI-001-A1-T1 — List the day-one steps
  ○ WI-001-A2 — Review the checklist with a recent starter (pending)
      ○ WI-001-A2-T1 — Walk through it with a recent starter

aaw lint: no issues

Next: WI-001-A1-T1
  Work item: WI-001 — Onboarding checklist
  Activity:  WI-001-A1 — Draft the checklist
  Task:      List the day-one steps
  Actor:     agent
```

`next-task` skips `WI-001-A2` because it depends on `WI-001-A1`, which is not complete.

## 7. Claim an activity

Several agents can work one work item at once because each claims an activity first. A
claim is a lock file in the work item's `locks/` folder.

```
node .ai-assisted-work/bin/aaw.js claim WI-001-A1 --agent me
node .ai-assisted-work/bin/aaw.js claim WI-001-A1 --agent other
node .ai-assisted-work/bin/aaw.js release WI-001-A1
```

You should see:

```
Claimed WI-001-A1 as me until 2026-...Z
aaw claim: WI-001-A1 is held by me
Released WI-001-A1
```

The second claim fails, with exit code 1, because the first one holds the activity for an
hour. That is the whole concurrency model in one line.

## 8. Hand it to your agent

Open the `aaw-demo` folder in your agent and start a new chat, so it loads the skills. Type
`/` and the `aaw-*` skills and `thread` should be listed. Then try:

```
/aaw-work-status WI-001
/aaw-next-task WI-001
/aaw-start-work write a one-page guide to our release process
```

The first two read the work item you wrote. The third triages a new request: most requests
are chores and get no work item at all; one that earns a work item gets scoped with you,
planned from the products it will leave behind, and written to `work-items/WI-002-...`.
`/aaw-progress-work WI-001` would then claim `WI-001-A1` and work it. If the skills are not
listed, see [Troubleshooting](troubleshooting.md#a-skill-is-not-listed-in-the-agent).

## 9. Optional: try `thread`

`thread` keeps a tree of why each chat exists, in a git repository you own. Try it against a
scratch store beside the workspace, so your real one is untouched.

PowerShell:

```powershell
git init --bare ../threads-store.git
$env:THREADS_HOME = "$PWD/../threads"
$env:THREADS_REMOTE = "$PWD/../threads-store.git"
```

bash:

```bash
git init --bare ../threads-store.git
export THREADS_HOME="$PWD/../threads"
export THREADS_REMOTE="$PWD/../threads-store.git"
```

Then, in either shell:

```
node .agents/skills/thread/bin/thread.mjs open "Write the onboarding checklist" --tool cli
node .agents/skills/thread/bin/thread.mjs tree
```

You should see an anchor line such as `🧵 t-pcj · Write the onboarding checklist · aaw-demo`,
then the tree with that thread open (`●`). The id is random, so yours differs. Close the
thread with your id and a one-line resolution:

```
node .agents/skills/thread/bin/thread.mjs done t-pcj "Checklist drafted in work-items/WI-001"
```

In an agent you type `/thread <what you are doing>` instead, and the agent runs these for
you. For real use, point `THREADS_REMOTE` at a private repository of your own; see
[the thread skill](skills/thread.md).

## 10. Clean up

Close the terminal (the `THREADS_*` variables go with it), then delete the `aaw-demo`
folder, and `threads` and `threads-store.git` beside it if you made them. Nothing was
written anywhere else.

## Next

- [Concepts](concepts/index.md): the ideas behind what you just did, in the order you need them
- [Installing in each agent](integration/index.md): workspace and user-level installs, hooks and updates
- [Skills](skills/index.md): what each skill does and how to call it
- [Configuration](reference/configuration.md) and [Commands](reference/commands.md): every key and flag
