# Quick start

From nothing to a work item your agent can report on, plan and work, in about ten minutes. You make a throwaway workspace, install the `work` and `thread` skills into it, add one small work item by hand, and hand it to your agent. The last step, optionally, tries the `thread` skill against a scratch store.

Every command below works in PowerShell and in bash. Where the two differ, both are shown.

## What you need

- Node.js 18 or newer
- git
- An agent that reads Agent Skills: VS Code with GitHub Copilot, Cursor, Claude Code, Codex or Gemini CLI

```
node --version
git --version
```

You should see `v18` or later, and any recent git.

## 1. Make a scratch workspace

```
mkdir skills-demo
cd skills-demo
git init
```

The skills install into a workspace, which is usually a git repository. This one is disposable.

If you use Claude Code, also run `mkdir .claude` now. Claude Code reads skills only from `.claude/skills/`, and the installer links that folder only when `.claude/` already exists.

## 2. Clone AI-Assisted Work into it

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
```

The clone holds the skills and the installer, `bin/skills.mjs`, a single file that needs no `npm install`.

## 3. Install

```
node .ai-assisted-work/bin/skills.mjs install work thread
```

You should see:

```
installed work 3.1.0 from bundle ai-assisted-work (.claude/skills linked)
installed thread 0.14.0 from bundle ai-assisted-work (.claude/skills linked)
```

without the part in brackets when there is no `.claude/`. The workspace now has the skills in `.agents/skills/`, and `.agents/skills.lock.json`, which records where they came from.

## 4. Check the install

```
node .ai-assisted-work/bin/skills.mjs check
node .agents/skills/work/bin/check.mjs
```

`check` lists each skill with `✓`. The work skill's own check warns that there is no `.aaw-config.yaml`, so the defaults apply, and that `./change/work-items/` does not exist yet, then ends with `work: ok`. That is right for a new workspace: the file is optional, and `work` creates the folder on first use. To keep work items somewhere else, such as outside the repository, set `work_items_path` in `.aaw-config.yaml` ([Configuration](reference/configuration.md#work_items_path)).

## 5. Add a tiny work item

A work item is a folder named `WI-NNN-<slug>` holding a `progress.yaml`. An agent writes these for you with `/work start`; here you write a small one by hand so there is something to drive. It names one product (a deliverable) and two activities that produce it: one for an agent, and one for a human that waits on the first.

PowerShell:

```powershell
New-Item -ItemType Directory -Force change/work-items/WI-001-onboarding-checklist | Out-Null
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
'@ | Set-Content -Encoding utf8 change/work-items/WI-001-onboarding-checklist/progress.yaml
```

bash:

```bash
mkdir -p change/work-items/WI-001-onboarding-checklist
cat > change/work-items/WI-001-onboarding-checklist/progress.yaml <<'EOF'
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

The full template, with every field explained, is [skills/work/assets/templates/progress.yaml](../skills/work/assets/templates/progress.yaml).

## 6. Hand it to your agent

Open the `skills-demo` folder in your agent and start a new chat, so it loads the skills. Type `/` and `work` and `thread` should be listed. Then try:

```
/work status WI-001
/work next WI-001
```

The status report lists both activities as pending. The next task is `WI-001-A1-T1`, "List the day-one steps": `WI-001-A2` is skipped because it depends on `WI-001-A1`, which is not complete, and because it is for a human.

## 7. Let the agent work it

```
/work progress WI-001
```

Several agents can work one work item at once because each claims an activity first. `/work progress` claims `WI-001-A1` by creating `change/work-items/WI-001-onboarding-checklist/locks/WI-001-A1.lock`, works its task, records the result in `progress.yaml`, and only then releases the lock. A second agent that tried to claim the same activity meanwhile would find the lock and pick something else. That is the whole concurrency model.

Then triage something new:

```
/work start write a one-page guide to our release process
```

Most requests are chores and get no work item at all; one that earns a work item gets scoped with you, planned from the products it will leave behind, and written to `change/work-items/WI-002-...`. If the skills are not listed, see [Troubleshooting](troubleshooting.md#a-skill-is-not-listed-in-the-agent).

## 8. Optional: try `thread`

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

You should see an anchor line such as `🧵 t-pcj · Write the onboarding checklist · skills-demo`,
then the tree with that thread open (`●`). The id is random, so yours differs. Close the
thread with your id and a one-line resolution:

```
node .agents/skills/thread/bin/thread.mjs done t-pcj "Checklist drafted in change/work-items/WI-001"
```

In an agent you type `/thread <what you are doing>` instead, and the agent runs these for
you. For real use, point `THREADS_REMOTE` at a private repository of your own; see
[the thread skill](skills/thread.md).

## 9. Clean up

Close the terminal (the `THREADS_*` variables go with it), then delete the `skills-demo` folder, and `threads` and `threads-store.git` beside it if you made them. Nothing was written anywhere else.

## Next

- [Concepts](concepts/index.md): the ideas behind what you just did, in the order you need them
- [Installing the skills](../DEPLOYMENT.md): declaring a workspace's skills in `.agents/skills.json`, updates and constrained environments
- [Installing in each agent](integration/index.md): where each agent looks, user-level installs and hooks
- [Skills](skills/index.md): what each skill does and how to call it
- [Configuration](reference/configuration.md) and [Commands](reference/commands.md): every key and flag
