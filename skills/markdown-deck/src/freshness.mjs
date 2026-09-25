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

/**
 * The command that brings the image up to date. When the model skill is installed beside
 * this one its real path is given; otherwise a placeholder the reader can fill in.
 */
export function renderCommand(image, check) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cli = path.resolve(here, '..', '..', 'model', 'bin', 'model.py');
  const bin = fs.existsSync(cli) ? shown(cli) : '<skills>/model/bin/model.py';
  return [
    'python', quote(bin), 'render', quote(shown(check.source)), '--out', quote(shown(image)),
    ...check.layers.flatMap((l) => ['--layer', quote(l)]),
  ].join(' ');
}

export function staleMessage(image, check) {
  const why = fs.existsSync(check.source)
    ? `${shown(check.source)} has changed since it was rendered`
    : `its source ${shown(check.source)} no longer exists`;
  return `stale render: ${shown(image)}, because ${why}. Re-render with: ${renderCommand(image, check)}`;
}
