#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * markdown-deck CLI.
 *
 *   markdown-deck build <input.md> [options]
 *   markdown-deck pdf   <deck.html> [--out deck.pdf]
 *   markdown-deck themes
 *
 * Every path is an argument. The CLI never assumes a repository layout, which is what
 * lets this skill be installed anywhere and published on its own.
 */

import path from 'node:path';
import { build, listThemes } from '../src/index.mjs';
import { exportPdf } from '../src/pdf.mjs';
import { publishAll, formatGraph } from '../src/publish.mjs';

const USAGE = `markdown-deck — tagged Markdown to HTML slides and PDF

Usage:
  markdown-deck build <input.md> [options]
  markdown-deck pdf <deck.html> [--out <file.pdf>]
  markdown-deck publish [<root>] --out <dir> [--list] [--pdf] [--skip a,b/c] [--reserved id,id]
                        [--registry <file> | --no-registry] [--registry-check] [--graph]
  markdown-deck themes

Build options:
  --out <dir>        output directory (default: <input dir>/dist)
  --theme <name>     built-in theme name, or a path to a .css file (default: default)
  --title <text>     deck title (default: front-matter title, else the filename)
  --subtitle <text>  cover subtitle
  --date <text>      cover date
  --footnote <text>  cover footnote
  --eyebrow <text>   small label on every content slide
  --logo <path>      cover logo, relative to the output directory
  --partials         also write slides/*.html fragments
  --thumbnails       slide index shows thumbnails; the default is titles only.
                     Front matter deck_thumbnails: true does the same per document
  --comments         add a per-slide comments panel that packages a review for email
                     or download. Front matter deck_comments: true does the same
  --feedback-to <a>  address the review email goes to (deck_feedback_to)
  --feedback-subject <s>  subject of the review email (deck_feedback_subject)
  --deck-id <id>     stable id for stored comments and the permanent URL (deck_id)
  --html-name <f>    file name for the deck (default deck.html; index.html to serve
                     it at its folder's URL)
  --pdf, --no-pdf    export deck.pdf too, or not (needs playwright). Defaults to deck_pdf
                     in front matter, then pdf in [suite.markdown-deck], else off

Publish: every document under <root> whose front matter says deck_publish: true, built to
<dir>/<deck_id>/index.html. --list shows them without building; --skip leaves folders out;
--reserved names ids something else already serves. Problems fail the command.
With a registry (--registry, or registry in [suite.markdown-deck]), every deck URL ever
published is remembered: new decks are recorded, and a published deck that disappears fails
the command until it is marked retired or redirected. --registry-check, or CI=true, only
checks, so an unrecorded deck fails rather than being recorded.
--graph prints what each deck was built from: included documents, and images rendered
from diagrams, marked STALE when the diagram changed after the render.

Stale renders: an image with a <image>.render.json record whose diagram has changed since
is warned about, and fails the build when CI is set.

Tags, written as HTML comments so they stay invisible wherever the Markdown renders:
  <!-- deck:cover subtitle="..." -->        the H1 becomes the cover slide
  <!-- deck:slide label="..." -->           the NEXT heading's section becomes a slide
  <!-- deck:skip --> ... <!-- /deck:skip -->  kept in the document, dropped from the slide
  <!-- deck:note --> ... <!-- /deck:note -->  becomes presenter notes
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (!cmd || args.help || args.h) { console.log(USAGE); process.exit(cmd ? 0 : 1); }

  if (cmd === 'themes') {
    console.log(listThemes().join('\n'));
    return;
  }

  if (cmd === 'pdf') {
    const input = args._[1];
    if (!input) { console.error('pdf: need a deck.html'); process.exit(1); }
    const out = args.out || path.join(path.dirname(path.resolve(input)), 'deck.pdf');
    const r = await exportPdf(input, out);
    console.log(`  ${path.relative(process.cwd(), r.path)} (${Math.round(r.bytes / 1024)} KB)`);
    return;
  }

  if (cmd === 'publish') {
    const root = args._[1] || '.';
    if (!args.out) { console.error('publish: need --out <dir>, where decks are written as <dir>/<deck_id>/index.html'); process.exit(1); }
    const list = (v) => (v && v !== true ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
    const r = await publishAll(root, {
      out: args.out, list: Boolean(args.list), pdf: Boolean(args.pdf),
      skip: list(args.skip), reserved: list(args.reserved),
      registry: args['no-registry'] ? false : (args.registry && args.registry !== true ? args.registry : undefined),
      registryMode: args['registry-check'] ? 'check' : undefined,
    });
    if (args.graph && !args.list) console.log(`\nDependencies\n${formatGraph(r.graph)}\n`);
    console.log(`  ${r.decks.length} deck(s)${r.problems.length ? `, ${r.problems.length} problem(s)` : ''}`);
    if (r.problems.length) process.exitCode = 1;
    return;
  }

  if (cmd !== 'build') { console.error(`unknown command: ${cmd}\n\n${USAGE}`); process.exit(1); }

  const input = args._[1];
  if (!input) { console.error('build: need an input .md'); process.exit(1); }

  let warnings = 0;
  const r = build(input, {
    out: args.out,
    theme: args.theme,
    title: args.title,
    subtitle: args.subtitle,
    date: args.date,
    footnote: args.footnote,
    eyebrow: args.eyebrow,
    logo: args.logo,
    partials: Boolean(args.partials),
    thumbnails: args.thumbnails ? true : undefined,
    comments: args.comments ? true : undefined,
    feedbackTo: args['feedback-to'],
    feedbackSubject: args['feedback-subject'],
    deckId: args['deck-id'],
    htmlName: args['html-name'],
    pdf: args['no-pdf'] ? false : (args.pdf ? true : undefined),
    onWarn: (m) => { warnings++; console.error(`  ! ${m}`); },
  });

  const rel = (p) => path.relative(process.cwd(), p) || '.';
  console.log(`  ${r.manifest.slides.length} slide(s)${r.manifest.cover ? ' + cover' : ''} -> ${rel(path.join(r.outDir, r.manifest.html))}`);

  if (r.pdf) {
    const pdfOut = path.join(r.outDir, 'deck.pdf');
    const p = await exportPdf(path.join(r.outDir, r.manifest.html), pdfOut);
    console.log(`  ${rel(p.path)} (${Math.round(p.bytes / 1024)} KB)`);
  }

  if (warnings) console.error(`  ${warnings} warning(s)`);
}

main().catch((e) => { console.error(`  ! ${e.message}`); process.exit(1); });
