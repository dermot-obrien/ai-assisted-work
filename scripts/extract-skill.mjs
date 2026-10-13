#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Build a standalone repository for one of this bundle's skills, with its history.
 *
 *   node scripts/extract-skill.mjs <skill> <out-dir> [--owner dermot-obrien]
 *
 * The skill's history is split out of skills/<skill> (git subtree split), moved back under
 * skills/<skill> so the repository has the layout of the other standalone skills, and given
 * what a repository of its own needs: README, NOTICE naming the commit it came from, the
 * licences, REUSE.toml, its documentation, its tests, the zero-dependency validators, a
 * bundle.json and CI. Then it is tagged v<version> and <skill>--v<version>. Nothing is
 * pushed: create the empty repository, then `git -C <out-dir> remote add origin <url>` and
 * `git -C <out-dir> push -u origin main --tags`.
 *
 * Running it again on a later commit rebuilds the repository from scratch, so the result
 * never depends on a copy that only one machine holds. Needs git and Node 18+.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const die = (m) => {
  process.stderr.write(`extract-skill: ${m}\n`);
  process.exit(1);
};
const git = (args, cwd = ROOT, env = {}) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] }).trim();

// What each skill takes with it. Docs pages are copied as they are, with links fixed below.
const SKILLS = {
  work: {
    summary: "Work items, activities, tasks and initiatives in plain files: triage, scope, plan, execute and report.",
    blurb: "An agent skill that manages real work in plain files: it triages a request into chore, change, intervention or inquiry and opens only the workspace that earns, plans a work item from the products it will leave behind, executes it one activity at a time under a lock, reports status, presents the next task and groups work items under initiatives. It works in any agent that reads [Agent Skills](https://agentskills.io/specification).",
    needs: "nothing to run; its post-install check needs Node.js 18 or newer. It needs no other skill",
    tests: ["test-work-schema.mjs"],
    testDeps: ["yaml"],
    schemas: ["bundle.schema.json"],
    guide: "docs/skills/work.md",
    commands: null,
    decisions: ["DD-03", "DD-06", "DD-11"],
  },
};

const [skill, outArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ownerIdx = process.argv.indexOf("--owner");
const OWNER = ownerIdx > 0 ? process.argv[ownerIdx + 1] : "dermot-obrien";
const S = SKILLS[skill];
if (!S || !outArg) die(`usage: extract-skill.mjs <${Object.keys(SKILLS).join("|")}> <out-dir> [--owner <owner>]`);
const OUT = path.resolve(outArg);
if (!existsSync(path.join(ROOT, "skills", skill, "SKILL.md"))) die(`no skills/${skill} here`);
if (git(["status", "--porcelain", `skills/${skill}`])) die(`skills/${skill} has uncommitted changes; commit them first`);

const SHA = git(["rev-parse", "HEAD"]);
const skillMd = readFileSync(path.join(ROOT, "skills", skill, "SKILL.md"), "utf8");
const VERSION = /^\s+version:\s*"([^"]+)"/m.exec(skillMd)?.[1] || die("no metadata.version in SKILL.md");
const ID = { GIT_AUTHOR_NAME: "Dermot O'Brien", GIT_AUTHOR_EMAIL: "dermot.obrien@patternode.com", GIT_COMMITTER_NAME: "Dermot O'Brien", GIT_COMMITTER_EMAIL: "dermot.obrien@patternode.com" };
const TRAILER = process.env.EXTRACT_TRAILER ? `\n\n${process.env.EXTRACT_TRAILER}` : "";

// 1. History: split the skill's folder out, into a fresh repository.
const branch = `extract-${skill}-${process.pid}`;
git(["subtree", "split", "-q", "-P", `skills/${skill}`, "-b", branch]);
try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  git(["init", "-q", "-b", "main"], OUT);
  git(["pull", "-q", ROOT, branch], OUT, ID);
} finally {
  git(["branch", "-D", "-q", branch]);
}
mkdirSync(path.join(OUT, "skills", skill), { recursive: true });
for (const f of git(["ls-tree", "--name-only", "HEAD"], OUT).split("\n").filter(Boolean)) git(["mv", f, `skills/${skill}/`], OUT);
git(["commit", "-q", "-m", `Move the skill to skills/${skill}, the layout of the other standalone skills${TRAILER}`], OUT, ID);

// 2. What a repository of its own needs.
const put = (rel, text) => {
  mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  writeFileSync(path.join(OUT, rel), text);
};
const copy = (from, to = from) => cpSync(path.join(ROOT, from), path.join(OUT, to), { recursive: true });
copy("LICENSE");
copy("LICENSES");
copy(".gitattributes");
for (const t of S.tests) copy(`scripts/${t}`);
copy("scripts/validate-skills.mjs");
copy("scripts/validate-bundle.mjs");
for (const sc of S.schemas) copy(`schemas/${sc}`);
put(".gitignore", "node_modules/\n.DS_Store\n");

// Docs: the guide, the commands, the decisions; links that pointed into this repository fixed.
const fixLinks = (t) =>
  t
    .replace(new RegExp(`\\]\\(\\.\\./\\.\\./skills/${skill}/`, "g"), `](../skills/${skill}/`)
    .replace(/\]\(\.\.\/reference\/commands\.md(#[^)]*)?\)/g, (m, anchor = "") => (S.commands ? `](commands.md${anchor})` : m))
    .replace(/\]\(\.\.\/\.\.\/skills\/([a-z-]+)\/[^)]*\)/g, (m, s) => (s === skill ? m : "](https://github.com/dermot-obrien/ai-assisted-work)"))
    .replace(/\]\((\.\.\/)+README\.md[^)]*\)/g, "](../README.md)");
put("docs/guide.md", fixLinks(readFileSync(path.join(ROOT, S.guide), "utf8")));
if (S.commands) {
  const c = readFileSync(path.join(ROOT, "docs/reference/commands.md"), "utf8");
  const k = c.indexOf(S.commands);
  const e = c.indexOf("\n## ", k + 1);
  put("docs/commands.md", "# Commands\n\n" + fixLinks(c.slice(k, e < 0 ? undefined : e)).trim() + "\n");
}
{
  const d = readFileSync(path.join(ROOT, "docs/about/design-decisions.md"), "utf8");
  const parts = S.decisions.map((id) => {
    const k = d.indexOf(`## ${id}:`);
    if (k < 0) return "";
    const e = d.indexOf("\n## ", k + 1);
    return d.slice(k, e < 0 ? undefined : e).replace(/\n---\s*$/, "").trim();
  });
  put("docs/design-decisions.md", `# Design decisions\n\nThe decisions behind this skill, numbered as they are in AI-Assisted Work, where it began. The rest of that list concerns the framework.\n\n${parts.filter(Boolean).join("\n\n")}\n`);
}

// Changelog: this skill's entries from the bundle's changelog.
{
  const c = readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const items = c.match(new RegExp(`^- (?:${skill} |\\x60${skill}\\x60)[^\\n]*(?:\\n  [^\\n]*)*`, "gm")) || [];
  put("CHANGELOG.md", `# Changelog\n\nAll notable changes to the ${skill} skill. Earlier entries are from AI-Assisted Work, where it began.\n\n## ${VERSION}\n\n${items.join("\n") || "- Extracted from AI-Assisted Work."}\n`);
}

// bundle.json: this skill alone, with its own purl.
{
  const b = JSON.parse(readFileSync(path.join(ROOT, "bundle.json"), "utf8"));
  const entry = { ...b.skills.find((s) => s.name === skill), version: VERSION, purl: `pkg:generic/${OWNER}/${skill}/${skill}@${VERSION}` };
  delete entry.source;
  put("bundle.json", JSON.stringify({ $schema: b.$schema, name: skill, owner: OWNER, description: S.summary, license: "CC-BY-4.0 AND Apache-2.0", homepage: `https://github.com/${OWNER}/${skill}`, derived_from: [`https://github.com/${OWNER}/ai-assisted-work/tree/${SHA}/skills/${skill}`], skills: [entry] }, null, 2) + "\n");
}

put("NOTICE", `Copyright 2026 Dermot O'Brien

This product is licensed under CC BY 4.0 (content) and Apache-2.0 (code).
See LICENSE and the texts in LICENSES/.

Derivation
----------

This product is derived from the ${skill} skill of AI-Assisted Work,
Copyright 2026 Dermot O'Brien, licensed under CC BY 4.0 (content) and
Apache-2.0 (code), at commit ${SHA}
(https://github.com/${OWNER}/ai-assisted-work/tree/${SHA}/skills/${skill}).
Its history up to that commit is kept in this repository.
`);

put("REUSE.toml", `version = 1

# ${skill} is dual-licensed, on the same terms as AI-Assisted Work, from which it is
# derived (see NOTICE): documentation and skill instructions under CC BY 4.0, executable
# code under Apache-2.0. REUSE Specification 3.3 (https://reuse.software/).

[[annotations]]
path = ["**.md", "**.yaml", "**.yml", "**.txt", "**.log", "skills/**"]
precedence = "aggregate"
SPDX-FileCopyrightText = "2026 Dermot O'Brien"
SPDX-License-Identifier = "CC-BY-4.0"

[[annotations]]
path = ["skills/**/bin/**", "scripts/**", "schemas/**", ".github/workflows/**", "bundle.json"]
precedence = "override"
SPDX-FileCopyrightText = "2026 Dermot O'Brien"
SPDX-License-Identifier = "Apache-2.0"

[[annotations]]
path = [".gitignore", ".gitattributes", "REUSE.toml", "LICENSE", "NOTICE"]
precedence = "override"
SPDX-FileCopyrightText = "2026 Dermot O'Brien"
SPDX-License-Identifier = "CC-BY-4.0"
`);

const testRun = S.tests.length ? `node --test ${S.tests.map((t) => `scripts/${t}`).join(" ")}` : "";
put(".github/workflows/ci.yml", `# SPDX-FileCopyrightText: 2026 Dermot O'Brien
# SPDX-License-Identifier: Apache-2.0

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  skills:
    name: Agent Skills validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      # Zero-dependency on purpose, so this job needs no install step.
      - name: Validate skills against the agentskills.io spec
        run: node scripts/validate-skills.mjs skills
      - name: Validate bundle.json against the bundle schema and the skills
        run: node scripts/validate-bundle.mjs .
${testRun ? `
  test:
    name: Tests (Node \${{ matrix.node }}, \${{ matrix.os }})
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
${S.testDeps.length ? `      - name: Test dependencies
        run: npm install --no-save --no-audit --no-fund ${S.testDeps.join(" ")}
` : ""}      - name: Tests
        run: ${testRun}
` : ""}`);

put("README.md", `<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# ${skill}

${S.blurb}

It needs ${S.needs}.

| Document | Covers |
|---|---|
| [Guide](docs/guide.md) | What it does and how to use it |
${S.commands ? "| [Commands](docs/commands.md) | Every command and flag |\n" : ""}| [Design decisions](docs/design-decisions.md) | Why it works this way |
| [SKILL.md](skills/${skill}/SKILL.md) | The instructions an agent follows |
| [CHANGELOG](CHANGELOG.md) | What changed in each release |

## Install

The skill is the folder \`skills/${skill}/\`. Put it where your agent reads skills: \`.agents/skills/${skill}/\` in a project (Codex, Cursor, Copilot, VS Code, Gemini CLI) and \`.claude/skills/${skill}/\` for Claude Code, or the tool's user skills folder for every project.

With the skills installer from the [AI-Assisted Work bundle](https://github.com/${OWNER}/ai-assisted-work):

\`\`\`
node <bundle>/bin/skills.mjs install --repo https://github.com/${OWNER}/${skill}.git --ref v${VERSION} --path skills/${skill}
\`\`\`

or copy the folder by hand. In a constrained environment, copy the folder onto the machine and install with \`--from <folder>\`.

## Configuration

\`.aaw-config.yaml\` at the workspace root, if present: \`work_items_path\`, \`initiatives_path\` and \`deliverables_register\`. Without it the defaults apply.

## Development

\`\`\`
${S.testDeps.length ? `npm install --no-save ${S.testDeps.join(" ")}\n` : ""}${testRun ? testRun + "\n" : ""}node scripts/validate-skills.mjs skills
node scripts/validate-bundle.mjs .
\`\`\`

## Licence

Documentation and skill instructions are [CC BY 4.0](LICENSES/CC-BY-4.0.txt); code is [Apache-2.0](LICENSES/Apache-2.0.txt). See [NOTICE](NOTICE). Created by Dermot O'Brien.
`);

// 3. A relative link in a copied page that does not resolve here points at the page in the bundle.
const SOURCES = { "docs/guide.md": S.guide, "docs/commands.md": "docs/reference/commands.md", "docs/design-decisions.md": "docs/about/design-decisions.md" };
for (const [rel, from] of Object.entries(SOURCES)) {
  const file = path.join(OUT, rel);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8").replace(/\]\(([^)\s#][^)\s]*)\)/g, (m, link) => {
    if (/^[a-z]+:/.test(link)) return m;
    const [target, anchor] = link.split("#");
    if (existsSync(path.join(path.dirname(file), target))) return m;
    const inBundle = path.posix.normalize(path.posix.join(path.posix.dirname(from), target));
    return `](https://github.com/${OWNER}/ai-assisted-work/blob/main/${inBundle}${anchor ? `#${anchor}` : ""})`;
  });
  writeFileSync(file, text);
}

git(["add", "-A"], OUT);
git(["commit", "-q", "-m", `Stand alone: README, NOTICE, licences, bundle.json, docs, tests and CI

The ${skill} skill as a repository of its own, derived from AI-Assisted Work at
${SHA} (see NOTICE), with its history kept.${TRAILER}`], OUT, ID);
for (const tag of [`v${VERSION}`, `${skill}--v${VERSION}`]) git(["tag", "-a", tag, "-m", `${skill} ${VERSION}`], OUT, ID);
console.log(`${OUT}: ${skill} ${VERSION}, ${git(["rev-list", "--count", "HEAD"], OUT)} commits, tagged v${VERSION} and ${skill}--v${VERSION}`);
console.log(`next: create ${OWNER}/${skill} (empty), then  git -C "${OUT}" remote add origin https://github.com/${OWNER}/${skill}.git && git -C "${OUT}" push -u origin main --tags`);
