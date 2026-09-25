// SPDX-License-Identifier: Apache-2.0
// Where a deck loads mermaid from: a local copy beside the deck where one can be found, so
// the deck opens from disk and on a network that blocks the CDN.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, findLocalMermaid, MERMAID_CDN } from '../src/index.mjs';

let dir;
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const quiet = { onWarn: () => {}, bindings: false };
const DOC = (body) => `---
title: "Diagram Deck"
---

# Diagram Deck

<!-- deck:slide -->
## Flow

${body}
`;
const DIAGRAM = '```mermaid\nsequenceDiagram\n  a->>b: hi\n```';

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-mermaid-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test('a deck without a diagram loads no mermaid', () => {
  const r = build(write('doc.md', DOC('Words.')), { out: path.join(dir, 'dist'), ...quiet });
  assert.doesNotMatch(r.deckHtml, /mermaid\.min\.js/);
  assert.ok(!fs.existsSync(path.join(dir, 'dist', 'assets', 'mermaid.min.js')));
});

test('a named local mermaid is copied beside the deck', () => {
  const m = write('vendor/mermaid.min.js', '/* mermaid */');
  const r = build(write('doc.md', DOC(DIAGRAM)), { out: path.join(dir, 'dist'), mermaidSrc: m, ...quiet });
  assert.match(r.deckHtml, /<script src="assets\/mermaid\.min\.js"><\/script>/);
  assert.equal(fs.readFileSync(path.join(dir, 'dist', 'assets', 'mermaid.min.js'), 'utf8'), '/* mermaid */');
});

test('a URL is used as given', () => {
  const r = build(write('doc.md', DOC(DIAGRAM)), {
    out: path.join(dir, 'dist'), mermaidSrc: 'https://example.test/mermaid.js', ...quiet,
  });
  assert.match(r.deckHtml, /<script src="https:\/\/example\.test\/mermaid\.js">/);
});

test('a named mermaid that is missing is warned about and the CDN used', () => {
  const warnings = [];
  const r = build(write('doc.md', DOC(DIAGRAM)), {
    out: path.join(dir, 'dist'), mermaidSrc: path.join(dir, 'gone.js'), bindings: false,
    onWarn: (m) => warnings.push(m),
  });
  assert.ok(warnings.some((w) => /mermaid not found/.test(w)), warnings.join('\n'));
  assert.ok(r.deckHtml.includes(`<script src="${MERMAID_CDN}">`));
});

test('an installed mermaid above the document is found and copied', () => {
  write('node_modules/mermaid/dist/mermaid.min.js', '/* installed */');
  const src = write('docs/deep/doc.md', DOC(DIAGRAM));
  assert.equal(findLocalMermaid(path.dirname(src)), path.join(dir, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'));
  const r = build(src, { out: path.join(dir, 'dist'), ...quiet });
  assert.match(r.deckHtml, /<script src="assets\/mermaid\.min\.js">/);
  assert.equal(fs.readFileSync(path.join(dir, 'dist', 'assets', 'mermaid.min.js'), 'utf8'), '/* installed */');
});

test('the mermaid binding resolves against the binding file', () => {
  write('.agents/skill-bindings.toml', '[suite.markdown-deck]\nmermaid = "../vendor/m.js"\n');
  write('vendor/m.js', '/* bound */');
  const src = write('doc.md', DOC(DIAGRAM));
  const r = build(src, { out: path.join(dir, 'dist'), onWarn: () => {} });
  assert.match(r.deckHtml, /<script src="assets\/mermaid\.min\.js">/);
  assert.equal(fs.readFileSync(path.join(dir, 'dist', 'assets', 'mermaid.min.js'), 'utf8'), '/* bound */');
});
