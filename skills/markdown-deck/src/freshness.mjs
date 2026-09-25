// SPDX-License-Identifier: Apache-2.0
/**
 * Stale renders.
 *
 * An image rendered from a diagram goes out of date silently when the diagram changes and
 * nobody re-renders it. A renderer that follows the convention leaves a record beside the
 * image, `<image>.render.json`, naming its source and a SHA-256 of it with line endings
 * normalised. The model skill's `render` command writes one. This module reads the record
 * and compares; it has no dependency on whatever wrote it, and an image without a record
 * is not checked.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RECORD_SUFFIX = '.render.json';

/** Matches the renderer: CRLF is not an edit, or Windows and CI would always disagree. */
export function fingerprint(file) {
  const data = fs.readFileSync(file);
  const norm = Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  return crypto.createHash('sha256').update(norm).digest('hex');
}

/**
 * @returns {null | {fresh: boolean, source: string, layers: string[]}}
 *   null when the image has no record, or the record cannot be read
 */
export function checkRender(image) {
  const rec = `${image}${RECORD_SUFFIX}`;
  if (!fs.existsSync(rec)) return null;
  let r;
  try {
    r = JSON.parse(fs.readFileSync(rec, 'utf8'));
  } catch {
    return null;
  }
  if (!r || typeof r.source !== 'string' || typeof r.sha256 !== 'string') return null;
  const source = path.resolve(path.dirname(image), r.source);
  const fresh = fs.existsSync(source) && fingerprint(source) === r.sha256;
  return { fresh, source, layers: Array.isArray(r.layers) ? r.layers.map(String) : [] };
}

const quote = (s) => (/[\s"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
const shown = (p) => {
  const rel = path.relative(process.cwd(), p);
  return (rel && !path.isAbsolute(rel) ? rel : p).split(path.sep).join('/');
};

// The model skill, when it is installed beside this one, as skills in one folder are.
const modelCli = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'model', 'bin', 'model.py');
const python = () => process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const renderArgs = (image, check) => [
  'render', check.source, '--out', image, ...check.layers.flatMap((l) => ['--layer', l]),
];

/**
 * The command that brings the image up to date. When the model skill is installed beside
 * this one its real path is given; otherwise a placeholder the reader can fill in.
 */
export function renderCommand(image, check) {
  const cli = modelCli();
  const bin = fs.existsSync(cli) ? shown(cli) : '<skills>/model/bin/model.py';
  const args = renderArgs(image, check).map((a) => (a === check.source || a === image ? shown(a) : a));
  return ['python', bin, ...args].map(quote).join(' ');
}

/**
 * Re-render a stale image with the model skill installed beside this one, then check it
 * again. Throws when the model skill is missing or the render fails, since a refresh that
 * silently leaves the old picture is worse than none.
 */
export function refreshRender(image, check, { run = spawnSync } = {}) {
  const cli = modelCli();
  if (!fs.existsSync(cli)) {
    throw new Error(`cannot refresh ${shown(image)}: the model skill is not installed beside markdown-deck`);
  }
  if (!fs.existsSync(check.source)) {
    throw new Error(`cannot refresh ${shown(image)}: its source ${shown(check.source)} no longer exists`);
  }
  const r = run(python(), [cli, ...renderArgs(image, check)], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    const why = r.error ? r.error.message : String(r.stderr || r.stdout || '').trim().split('\n').pop();
    throw new Error(`re-rendering ${shown(image)} failed: ${why}`);
  }
  return checkRender(image);
}

export function staleMessage(image, check) {
  const why = fs.existsSync(check.source)
    ? `${shown(check.source)} has changed since it was rendered`
    : `its source ${shown(check.source)} no longer exists`;
  return `stale render: ${shown(image)}, because ${why}. Re-render with: ${renderCommand(image, check)}`;
}
