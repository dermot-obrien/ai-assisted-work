// SPDX-License-Identifier: Apache-2.0
/**
 * markdown-deck library entry point.
 *
 * build() takes one tagged Markdown file and writes a self-contained deck. It has no
 * knowledge of any host repository: every path it touches is derived from its arguments.
 * That is what makes this skill publishable on its own.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { createRequire } from 'node:module';
import {
  collectSlides, collectCover, slideBody, rewriteImages, linkDefinitions, findSection, slug,
} from './parse.mjs';
import { makeMarked, renderSlideBody, renderDeck, renderPartial } from './render.mjs';
import { repoDefaults, workspaceRoot } from './bindings.mjs';
import { checkRender, staleMessage, refreshRender } from './freshness.mjs';

const { findPublishedDecks } = createRequire(import.meta.url)('./catalog.cjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.resolve(HERE, '..', 'themes');

export function listThemes() {
  return fs.readdirSync(THEMES)
    .filter((f) => f.endsWith('.css') && !f.startsWith('_'))
    .map((f) => f.replace(/\.css$/, ''));
}

/** The tokens a palette may set. Anything else is rejected rather than silently ignored. */
export const PALETTE_TOKENS = Object.freeze([
  'font-body', 'font-mono',
  'deck-bg', 'slide-bg', 'slide-fg', 'body', 'heading', 'on-heading', 'rule', 'row-alt',
  'accent', 'accent-deep', 'accent-wash',
  'code-bg', 'code-fg', 'code-inline-bg',
  'cover-bg', 'cover-fg', 'cover-accent', 'cover-muted', 'cover-faint',
  'chrome-fg',
]);

/**
 * Turn a palette into a `:root` block that overrides the theme's tokens.
 *
 * A palette is how an organisation gets its own colours without shipping a CSS file
 * into this skill: it sets the tokens in its own `.agents/skill-bindings.toml`, and the
 * skill stays brand-free. Keys are token names without the `--` prefix, so a binding
 * reads `heading = "#143a5a"` rather than carrying CSS syntax.
 *
 * An unknown key throws. A palette is small and hand-written, and a typo that silently
 * does nothing is worse than a build that stops and names it.
 */
export function paletteCss(palette) {
  if (!palette || typeof palette !== 'object') return '';
  const entries = Object.entries(palette)
    .filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  for (const [k] of entries) {
    if (!PALETTE_TOKENS.includes(k)) {
      throw new Error(`unknown palette token: ${k}. Known tokens: ${PALETTE_TOKENS.join(', ')}`);
    }
  }
  const decls = entries.map(([k, v]) => `  --${k}: ${v};`).join('\n');
  return `\n/* palette override */\n:root {\n${decls}\n}\n`;
}

/**
 * Theme CSS is the theme's tokens, then the layout base, then any palette override.
 *
 * A theme may be a built-in name or a path to a .css file. The palette comes last so it
 * wins over whichever theme was chosen, which is what lets an organisation keep a
 * built-in theme's layout and change only its colours.
 */
export function loadTheme(name, palette) {
  const base = fs.readFileSync(path.join(THEMES, '_base.css'), 'utf8');
  const builtin = path.join(THEMES, `${name}.css`);
  const file = fs.existsSync(builtin) ? builtin : path.resolve(name);
  if (!fs.existsSync(file)) {
    throw new Error(`no such theme: ${name}. Available: ${listThemes().join(', ')}`);
  }
  return `${fs.readFileSync(file, 'utf8')}\n${base}${paletteCss(palette)}`;
}

/**
 * Resolves `deck:include` tags for one document.
 *
 *   src="../other.md"   a document by path, relative to the including one
 *   deck="<deck_id>"    a published deck by its permanent id, found through the catalog,
 *                       so the include survives the source document being moved
 *   section="Heading"   a section by heading text; the source need not be a deck
 *   slide="<slide-id>"  a slide the source already tags, by its id
 *
 * Anything that cannot be found throws, naming what was asked for and what exists: a
 * silently missing slide in a deck is worse than a failed build.
 */
function includer(srcPath, rootOpt) {
  let catalogCache = null;
  const root = rootOpt || workspaceRoot(path.dirname(srcPath));
  const byDeckId = (id) => {
    if (!catalogCache) catalogCache = findPublishedDecks(root).decks;
    const d = catalogCache.find((x) => x.id === id);
    if (!d) {
      throw new Error(`deck:include deck="${id}": no published deck has that id under ${root}. `
        + `Known: ${catalogCache.map((x) => x.id).join(', ') || '(none)'}`);
    }
    return path.join(root, d.source);
  };
  return (s) => {
    const file = s.deck ? byDeckId(s.deck) : path.resolve(path.dirname(srcPath), s.src);
    const where = s.deck ? `deck "${s.deck}"` : s.src;
    if (!fs.existsSync(file)) throw new Error(`deck:include src="${s.src}": no such file (${file})`);
    if (path.resolve(file) === path.resolve(srcPath)) throw new Error(`deck:include of ${where} includes itself`);
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    let found;
    if (s.slide) {
      const tagged = collectSlides(content).filter((x) => x.kind === 'content');
      found = tagged.find((x) => slug(x.label) === s.slide);
      if (!found) {
        throw new Error(`deck:include of ${where}: no slide "${s.slide}". `
          + `Slides: ${tagged.map((x) => slug(x.label)).join(', ') || '(none tagged)'}`);
      }
    } else {
      found = findSection(content, s.section);
      if (!found) throw new Error(`deck:include of ${where}: no section headed "${s.section}"`);
    }
    return {
      file, where, title: found.title, body: found.body, defs: linkDefinitions(content),
      // The source's own eyebrow names it best, when it sets one.
      sourceTitle: String(data.deck_eyebrow || data.sidebar_label || data.title
        || path.basename(file, path.extname(file))),
    };
  };
}

/**
 * Width and height of a PNG from its header, or null for anything else. Enough to check
 * that an image slide is 16:9 and high-definition without an image library.
 */
export function pngSize(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(24);
    fs.readSync(fd, b, 0, 24, 0);
    fs.closeSync(fd);
    if (b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/** An image slide fills the 16:9 canvas; say so when the image will not. */
function checkImage(file, label, onWarn) {
  const size = pngSize(file);
  if (!size) return;
  const ratio = size.width / size.height;
  if (Math.abs(ratio - 16 / 9) > 0.02) {
    onWarn(`image slide "${label}" is ${size.width}x${size.height}, not 16:9; it will be letterboxed`);
  } else if (size.width < 1920) {
    onWarn(`image slide "${label}" is ${size.width}x${size.height}; below 1920x1080 it will look soft when presented`);
  }
}

/**
 * @param {string} input     path to the tagged Markdown file
 * @param {object} opts      { out, theme, title, subtitle, date, footnote, eyebrow,
 *                             logo, mermaidSrc, partials, thumbnails, comments,
 *                             feedbackTo, feedbackSubject, deckId, htmlName,
 *                             bindings, strictRenders, refresh, root, onWarn, onLog }
 *
 * `refresh` re-renders a stale image through the model skill before using it, so a
 * build picks up a diagram edited since its last render.
 *
 * An image with a render record (see freshness.mjs) whose source has changed since it was
 * rendered is reported. `strictRenders` makes that fail the build; it defaults to on when
 * the CI environment variable is set, so a stale picture warns locally and fails in CI.
 *
 * Each setting resolves option, then the document's front matter, then the repository's
 * [suite.markdown-deck] binding, then the built-in default. Pass `bindings: false` to
 * ignore the repository.
 * @returns {{deckHtml: string, slides: object[], outDir: string, manifest: object, pdf: boolean}}
 *   pdf is whether a PDF is wanted (option, deck_pdf, the pdf binding, else false). build()
 *   does not export it, since export is asynchronous; the caller does, as the CLI does.
 */
export function build(input, opts = {}) {
  const onWarn = opts.onWarn || ((m) => console.error(`  ! ${m}`));
  const srcPath = path.resolve(input);
  if (!fs.existsSync(srcPath)) throw new Error(`input not found: ${srcPath}`);
  const srcDir = path.dirname(srcPath);

  const { data, content } = matter(fs.readFileSync(srcPath, 'utf8'));
  const cover = collectCover(content);
  const found = collectSlides(content, { onWarn });
  if (!cover && found.length === 0) {
    throw new Error(`${input} carries no deck: tags. Add <!-- deck:cover -->, <!-- deck:slide --> or <!-- deck:image -->.`);
  }

  const outDir = path.resolve(opts.out || path.join(srcDir, 'dist'));
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(outDir, { recursive: true });

  const repo = opts.bindings === false ? {} : repoDefaults(srcDir).values;
  const pick = (opt, fm, key, fallback) => opt ?? data[fm] ?? repo[key] ?? fallback;
  const title = opts.title || data.title || data.sidebar_label || path.basename(srcPath, '.md');
  // The small line above every slide title. deck_eyebrow sets it for the deck, "" turns
  // it off; a slide's own eyebrow attribute overrides it for that slide.
  const eyebrow = String(opts.eyebrow ?? data.deck_eyebrow ?? data.sidebar_label ?? '');
  const deckId = slug(opts.deckId || data.deck_id || title);
  const htmlName = opts.htmlName || 'deck.html';
  const css = loadTheme(
    pick(opts.theme, 'deck_theme', 'theme', 'default'),
    pick(opts.palette, 'deck_palette', 'palette', undefined),
  );
  const mdInst = makeMarked();

  // Images resolve against the document they are written in, which for an included slide
  // is the source document, not this one.
  // Everything the deck was built from, for the manifest; and any image rendered from a
  // diagram that has changed since.
  const root = opts.root || workspaceRoot(srcDir);
  const fromRoot = (f) => path.relative(root, f).split(path.sep).join('/');
  const documents = new Set([srcPath]);
  const images = new Map();
  const stale = [];
  const copyAsset = (href, baseDir = srcDir) => {
    const from = path.resolve(baseDir, href);
    if (!fs.existsSync(from)) {
      onWarn(`image not found, left as-is: ${href}`);
      return null;
    }
    if (!images.has(from)) {
      let check = checkRender(from);
      // --refresh re-renders a stale image before it is copied, rather than reporting it.
      if (check && !check.fresh && opts.refresh) {
        (opts.onLog || console.log)(`  re-rendering ${path.relative(root, from).split(path.sep).join('/')}`);
        check = refreshRender(from, check);
      }
      images.set(from, check);
      if (check && !check.fresh) stale.push(staleMessage(from, check));
    }
    fs.mkdirSync(assetsDir, { recursive: true });
    const base = path.basename(from);
    fs.copyFileSync(from, path.join(assetsDir, base));
    return `assets/${encodeURIComponent(base)}`;
  };

  // Reference links resolve against definitions anywhere in the document, usually its
  // foot, so every slide carries the full set.
  const defs = linkDefinitions(content);
  const used = new Set();
  const uniqueId = (label) => {
    let file = slug(label);
    let n = 2;
    while (used.has(file)) file = `${slug(label)}-${n++}`;
    used.add(file);
    return file;
  };
  const slides = [];
  const resolveInclude = includer(srcPath, root);
  for (const s of found) {
    if (s.kind === 'include') {
      // A section of another document, rendered here in this deck's theme. The eyebrow
      // names where it came from; links and images resolve from the source.
      const inc = resolveInclude(s);
      documents.add(path.resolve(inc.file));
      const { body: stripped, notes } = slideBody(inc.body);
      if (!stripped) throw new Error(`deck:include of ${inc.where} is empty after deck:skip removal`);
      const incDir = path.dirname(inc.file);
      // A section that is nothing but an image is a picture of a slide, so it fills the
      // canvas, like deck:image, rather than sitting shrunk under this deck's header.
      // header="true" keeps the header layout instead.
      const only = stripped.match(/^!\[[^\]]*\]\(([^)\s]+)[^)]*\)$/);
      if (only && !s.header) {
        const src = copyAsset(decodeURIComponent(only[1]), incDir);
        if (!src) throw new Error(`deck:include of ${inc.where}: image ${only[1]} not found`);
        checkImage(path.resolve(incDir, decodeURIComponent(only[1])), s.title || inc.title, onWarn);
        const label = s.label || s.title || inc.title;
        slides.push({
          kind: 'image', file: uniqueId(label), label, title: s.title || inc.title, src,
          header: false, source: inc.where, caption: s.eyebrow ?? `From ${inc.sourceTitle}`, notes: [],
        });
        continue;
      }
      slides.push({
        kind: 'content',
        file: uniqueId(s.label || inc.title),
        label: s.label || inc.title,
        title: s.title || inc.title,
        eyebrow: s.eyebrow ?? `From ${inc.sourceTitle}`,
        source: inc.where,
        notes,
        bodyHtml: renderSlideBody(
          `${rewriteImages(stripped, (href) => copyAsset(href, incDir))}\n\n${inc.defs}`, mdInst),
      });
      continue;
    }
    if (s.kind === 'image') {
      const src = copyAsset(decodeURIComponent(s.src));
      if (!src) {
        onWarn(`image slide "${s.label}" skipped: ${s.src} not found`);
        continue;
      }
      checkImage(path.resolve(srcDir, decodeURIComponent(s.src)), s.label, onWarn);
      slides.push({ kind: 'image', file: uniqueId(s.label), label: s.label, title: s.title, src, header: s.header, notes: [] });
      continue;
    }
    const { body: stripped, notes } = slideBody(s.body);
    if (!stripped) {
      onWarn(`slide "${s.label}" is empty after deck:skip removal; skipped`);
      continue;
    }
    slides.push({
      kind: 'content',
      file: uniqueId(s.label),
      label: s.label,
      title: s.title,
      ...(s.eyebrow !== undefined ? { eyebrow: s.eyebrow } : {}),
      notes,
      bodyHtml: renderSlideBody(`${rewriteImages(stripped, copyAsset)}\n\n${defs}`, mdInst),
    });
  }

  const strict = opts.strictRenders ?? Boolean(process.env.CI);
  if (stale.length && strict) throw new Error(stale.join('\n'));
  for (const m of stale) onWarn(m);

  const deckHtml = renderDeck({
    title,
    eyebrow,
    css,
    cover: cover
      ? {
          subtitle: opts.subtitle ?? cover.subtitle ?? data.description ?? '',
          date: opts.date ?? cover.date ?? '',
          footnote: opts.footnote ?? cover.footnote ?? '',
          logo: opts.logo ?? cover.logo ?? '',
        }
      : null,
    slides,
    mermaidSrc: opts.mermaidSrc || 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
    // The slide index lists titles unless asked for thumbnails, by option or front matter.
    thumbnails: Boolean(pick(opts.thumbnails, 'deck_thumbnails', 'thumbnails', false)),
    // Per-slide review comments, off unless asked for. The id keys the reviewer's stored
    // comments, so it must not change when the file is renamed or the title reworded.
    comments: Boolean(pick(opts.comments, 'deck_comments', 'comments', false)),
    id: deckId,
    version: data.version ? String(data.version) : '',
    feedback: {
      to: String(pick(opts.feedbackTo, 'deck_feedback_to', 'feedbackTo', '')),
      subject: String(pick(opts.feedbackSubject, 'deck_feedback_subject', 'feedbackSubject', '')),
    },
  });
  fs.writeFileSync(path.join(outDir, htmlName), deckHtml);

  if (opts.partials) {
    const dir = path.join(outDir, 'slides');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const s of slides) {
      fs.writeFileSync(path.join(dir, `${s.file}.html`), renderPartial(s, { css, eyebrow }));
    }
  }

  const manifest = {
    generator: 'markdown-deck',
    id: deckId,
    html: htmlName,
    source: path.relative(outDir, srcPath).split(path.sep).join('/'),
    title,
    version: data.version || '0.1',
    status: data.status || 'Draft',
    cover: Boolean(cover),
    slides: slides.map((s) => ({
      file: s.file, kind: s.kind, label: s.label, title: s.title, ...(s.source ? { source: s.source } : {}),
    })),
    // What the deck was built from, relative to the workspace root, so a workspace can
    // see which decks a change reaches. Includes read sources, not built decks, so these
    // are documents and images, never other decks.
    dependencies: {
      documents: [...documents].map(fromRoot),
      images: [...images].map(([file, check]) => ({
        path: fromRoot(file),
        ...(check ? { source: fromRoot(check.source), stale: !check.fresh } : {}),
      })),
    },
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const wantPdf = pick(opts.pdf, 'deck_pdf', 'pdf', false);
  return { deckHtml, slides, outDir, manifest, pdf: wantPdf === true || wantPdf === 'true' };
}

export { collectSlides, collectCover, slideBody, rewriteImages } from './parse.mjs';
