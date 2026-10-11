#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Dermot O'Brien
# SPDX-License-Identifier: Apache-2.0
#
# WI-004 A8: the skills in a constrained environment, repeatable.
#
# A machine whose git may use only local files (GIT_ALLOW_PROTOCOL=file: no https, no ssh),
# with an empty home, no threads remote and no npm registry use. The skills arrive as copied
# folders (a USB stick, a file share). Run from the bundle's root:
#
#   bash change/work-items/WI-004-skills-extracted-aaw-a-bundle/trial-constrained.sh
#
# Prints PASS or FAIL per step, and exits non-zero on the first failure.
set -euo pipefail

BUNDLE="$(pwd)"
TRIAL="$(mktemp -d)"
trap 'rm -rf "$TRIAL"' EXIT
step() { printf '%-70s' "$1"; }
pass() { echo PASS; }
fail() { echo "FAIL: $1"; exit 1; }

# On a connected machine: put copies of the skills on the stick. markdown-deck stands in for
# a skill that lives in a repository of its own.
USB="$TRIAL/usb"
mkdir -p "$USB"
cp -r skills/work skills/thread "$USB/"
git clone -q --depth 1 --branch markdown-deck--v0.6.8 https://github.com/dermot-obrien/markdown-deck.git "$USB/markdown-deck"

# The constrained machine from here on.
export HOME="$TRIAL/home" GIT_ALLOW_PROTOCOL=file THREADS_REMOTE= THREADS_HOME= BOARD_AS= SKILLS_BASE_URL=
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
mkdir -p "$HOME"
WS="$TRIAL/work-laptop"
mkdir -p "$WS/.claude"
git -C "$WS" init -q
cd "$WS"

step "1. a clone from GitHub is refused here (the machine is constrained)"
if git clone -q https://github.com/dermot-obrien/markdown-deck.git "$TRIAL/x" 2>/dev/null; then fail "the clone worked"; fi; pass

step "2. installing without --from fails with a pointer to --from"
out=$(node "$BUNDLE/bin/skills.mjs" install markdown-deck --bundle "$BUNDLE" 2>&1 || true)
echo "$out" | grep -q -- "--from" || fail "$out"; pass

step "3. work, thread and markdown-deck install from the copies"
node "$BUNDLE/bin/skills.mjs" install work thread markdown-deck --bundle "$BUNDLE" --from "$USB" >/dev/null || fail "install"
for s in work thread markdown-deck; do test -f ".agents/skills/$s/SKILL.md" && test -e ".claude/skills/$s" || fail "$s missing"; done; pass

step "4. skills check: every installed copy matches its lock"
node "$BUNDLE/bin/skills.mjs" check >/dev/null || fail "check"; pass

step "5. a local threads store, from .aaw-config.yaml, with no remote"
printf 'threads_home: ../threads-local\nthreads_remote: local\nwork_items_path: ./work-items\n' > .aaw-config.yaml
mkdir -p work-items
T="node .agents/skills/thread/bin/thread.mjs"
out=$($T open "Prepare the quarterly report" 2>&1) || fail "$out"
echo "$out" | grep -q "NOT PUSHED" && fail "tried to push"
test -d "$TRIAL/threads-local/.git" || fail "no store"
test -z "$(git -C "$TRIAL/threads-local" remote)" || fail "the store has a remote"; pass

step "6. the board works on the local store: dump, curator, file"
$T board start --as cur --role curator >/dev/null || fail "start"
id=$($T board dump "chase the supplier about the invoice" | sed -n 's/.*📥 \(p-[0-9a-z]*\).*/\1/p')
$T board file "$id" --is chore --plan WI-001-A1 --as cur >/dev/null || fail "file"
$T tree | grep -q "chase the supplier about the invoice \[chore\] → WI-001-A1" || fail "tree"; pass

step "7. the work skill's check passes in this workspace"
SKILL_DIR=.agents/skills/work node .agents/skills/work/bin/check.mjs >/dev/null || fail "check"; pass

step "8. nothing reached the network (no remote anywhere, no clone cache)"
test ! -d .agents/.skill-sources || fail "a clone was made"; pass

echo "All steps passed."
