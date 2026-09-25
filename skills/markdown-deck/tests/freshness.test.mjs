// SPDX-License-Identifier: Apache-2.0
// Stale renders and the dependency record: an image rendered from a diagram carries a
// <image>.render.json record, and a deck says when the diagram has moved on since.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src/index.mjs';
import { fingerprint, checkRender } from '../src/freshness.mjs';
import { publishAll, formatGraph } from '../src/publish.mjs';

let root;
const write = (rel, text) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const record = (image, source, layers = []) => write(`${image}.render.json`, JSON.stringify({
  source, sha256: fingerprint(path.resolve(path.dirname(path.join(root, image)), source)), layers,
}));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-fresh-'));
  write('arch/diagram.drawio', '<mxfile>\n<diagram/>\n</mxfile>\n');
  write('arch/view.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  record('arch/view.svg', 'diagram.drawio', ['Structure']);
  write('arch/ref.md', '---\ntitle: "Ref"\n---\n\n# Ref\n\n## The view\n\n![view](./view.svg)\n');
  write('plan.md', '---\ntitle: "Plan"\ndeck_publish: true\ndeck_id: plan\n---\n\n# Plan\n\n'
    + '<!-- deck:slide -->\n## One\n\nText.\n\n'
    + '<!-- deck:include src="./arch/ref.md" section="The view" -->\n');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const run = (opts = {}) => {
  const warnings = [];
  const r = build(path.join(root, 'plan.md'), {
    out: path.join(root, 'out'), root, bindings: false, strictRenders: false,
    onWarn: (m) => warnings.push(m), ...opts,
  });
  return { r, warnings };
};

test('fingerprint ignores line endings, as the renderer does', () => {
  const lf = write('a.txt', 'one\ntwo\n');
  const crlf = write('b.txt', 'one\r\ntwo\r\n');
  assert.equal(fingerprint(lf), fingerprint(crlf));
  assert.equal(fingerprint(lf), crypto.createHash('sha256').update('one\ntwo\n').digest('hex'));
});

test('an image without a record is not checked', () => {
  fs.rmSync(path.join(root, 'arch/view.svg.render.json'));
  assert.equal(checkRender(path.join(root, 'arch/view.svg')), null);
  const { r, warnings } = run();
  assert.deepEqual(warnings, []);
  assert.deepEqual(r.manifest.dependencies.images, [{ path: 'arch/view.svg' }]);
});

test('a fresh render is silent and recorded as a dependency', () => {
  const { r, warnings } = run();
  assert.deepEqual(warnings, []);
  assert.deepEqual(r.manifest.dependencies, {
    documents: ['plan.md', 'arch/ref.md'],
    images: [{ path: 'arch/view.svg', source: 'arch/diagram.drawio', stale: false }],
  });
});

test('a changed diagram warns, naming the render command with its layers', () => {
  fs.appendFileSync(path.join(root, 'arch/diagram.drawio'), '<!-- moved a box -->\n');
  const { r, warnings } = run();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /stale render: .*view\.svg/);
  assert.match(warnings[0], /diagram\.drawio has changed/);
  assert.match(warnings[0], /render .*diagram\.drawio --out .*view\.svg --layer Structure/);
  assert.equal(r.manifest.dependencies.images[0].stale, true);
});

test('a stale render fails the build when strict, as it is in CI', () => {
  fs.appendFileSync(path.join(root, 'arch/diagram.drawio'), 'x');
  assert.throws(() => run({ strictRenders: true }), /stale render/);
});

test('a deleted diagram counts as stale', () => {
  fs.rmSync(path.join(root, 'arch/diagram.drawio'));
  const { warnings } = run();
  assert.match(warnings[0], /no longer exists/);
});

test('publish returns the graph, and formatGraph names shared sources', async () => {
  write('other.md', '---\ntitle: "Other"\ndeck_publish: true\ndeck_id: other\n---\n\n# Other\n\n'
    + '<!-- deck:include src="./arch/ref.md" section="The view" -->\n');
  const r = await publishAll(root, {
    out: path.join(root, 'site'), registry: false, onLog: () => {}, onWarn: () => {},
  });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.graph.map((g) => g.id).sort(), ['other', 'plan']);
  const text = formatGraph(r.graph);
  assert.match(text, /includes {2}arch\/ref\.md/);
  assert.match(text, /image {5}arch\/view\.svg {2}<- arch\/diagram\.drawio/);
  assert.match(text, /Used by more than one deck:[\s\S]*arch\/ref\.md {2}-> (plan, other|other, plan)/);
  assert.doesNotMatch(text, /STALE/);
});
