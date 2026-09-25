#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Assemble this skill into a standalone, publishable git repository.
 *
 * The installed shape and the published shape differ on purpose:
 *
 *   installed   .agents/skills/markdown-deck/SKILL.md      (name must match parent dir)
 *   published   markdown-deck/skills/markdown-deck/SKILL.md
 *
 * Nesting the payload under skills/ keeps repo scaffolding (plugin manifests, changelog,
 * CI) out of the directory that lands in every consumer's context window, and it is the
 * layout the install tooling expects: `gh skill install owner/repo markdown-deck`,
 * `npx skills add owner/repo/skills/markdown-deck`, and
 * `gemini skills install <url> --path skills/markdown-deck` all resolve it.
 *
 * Usage:
 *   node scripts/pack-repo.mjs --out ../../../../markdown-deck --owner patternode
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = path.basename(SKILL_DIR);

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outRoot = path.resolve(argOf('--out', path.join(SKILL_DIR, '..', '..', '..', '.tmp', NAME)));
const owner = argOf('--owner', 'OWNER');
const repoUrl = argOf('--repo', `https://github.com/${owner}/${NAME}`);

const pkg = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'package.json'), 'utf8'));
const version = pkg.version;

// Files that belong to the repo, not to the portable skill payload.
const REPO_ONLY = new Set(['README.md', 'CHANGELOG.md', '.gitignore', '.gitattributes']);
const NEVER = new Set(['node_modules', '.git', '.tmp', 'dist']);

function copyTree(from, to, filter = () => true) {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (NEVER.has(e.name)) continue;
    const src = path.join(from, e.name);
    const rel = path.relative(SKILL_DIR, src).split(path.sep).join('/');
    if (!filter(rel, e)) continue;
    const dst = path.join(to, e.name);
    if (e.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copyTree(src, dst, filter); }
    else fs.copyFileSync(src, dst);
  }
}

fs.rmSync(outRoot, { recursive: true, force: true });
const payload = path.join(outRoot, 'skills', NAME);
fs.mkdirSync(payload, { recursive: true });

// 1. The portable payload. LICENSE stays inside it so a copied directory is legally
//    self-sufficient, which is what Anthropic's own published skills do.
copyTree(SKILL_DIR, payload, (rel) => !REPO_ONLY.has(rel) && !rel.startsWith('scripts/pack-repo'));

// 2. Repo-level files.
for (const f of REPO_ONLY) {
  const src = path.join(SKILL_DIR, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outRoot, f));
}
fs.copyFileSync(path.join(SKILL_DIR, 'LICENSE'), path.join(outRoot, 'LICENSE'));
fs.mkdirSync(path.join(outRoot, 'LICENSES'), { recursive: true });
fs.copyFileSync(path.join(SKILL_DIR, 'LICENSE'), path.join(outRoot, 'LICENSES', 'Apache-2.0.txt'));

// 3. Claude Code plugin + marketplace. This is the only distribution route that resolves
//    skill dependencies, so it is worth shipping even for a skill that has none today.
const pluginDir = path.join(outRoot, '.claude-plugin');
fs.mkdirSync(pluginDir, { recursive: true });
fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
  name: NAME,
  displayName: 'Markdown Deck',
  version,
  description: pkg.description,
  author: { name: owner, url: `https://github.com/${owner}` },
  repository: repoUrl,
  license: pkg.license,
  keywords: pkg.keywords,
  skills: './skills/',
  dependencies: [],
}, null, 2) + '\n');
fs.writeFileSync(path.join(pluginDir, 'marketplace.json'), JSON.stringify({
  name: `${owner}-skills`,
  owner: { name: owner },
  plugins: [{
    name: NAME,
    source: './',
    description: pkg.description,
    version,
    category: 'documentation',
    tags: pkg.keywords,
  }],
}, null, 2) + '\n');

const count = (d) => fs.readdirSync(d, { withFileTypes: true })
  .reduce((n, e) => n + (NEVER.has(e.name) ? 0 : e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);

console.log(`  packed ${NAME} v${version} -> ${outRoot}`);
console.log(`  ${count(outRoot)} files; payload at skills/${NAME}/`);
console.log('');
console.log('  next:');
console.log(`    cd ${outRoot}`);
console.log('    git init && git add -A && git commit -m "markdown-deck ' + version + '"');
console.log(`    git remote add origin ${repoUrl}.git && git push -u origin main`);
console.log(`    git tag v${version} && git push --tags`);
