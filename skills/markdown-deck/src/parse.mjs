// SPDX-License-Identifier: Apache-2.0
/**
 * Tag parsing for markdown-deck.
 *
 * The document is the source of truth. Slides are selected by HTML comments, which are
 * invisible wherever the Markdown is rendered normally, and slide boundaries never use a
 * `---` ruler because a ruler is visible in the rendered document.
 *
 * Pure functions over strings. Nothing here touches the filesystem.
 */

export const COVER_RE = /<!--\s*deck:cover([^>]*?)-->/;
export const SLIDE_RE = /<!--\s*deck:slide([^>]*?)-->/g;
export const IMAGE_RE = /<!--\s*deck:image([^>]*?)-->/g;
export const INCLUDE_RE = /<!--\s*deck:include([^>]*?)-->/g;
// A link reference definition: `[label]: url "optional title"`, up to three spaces in.
const LINK_DEF_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*(\S+)(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/gm;
export const SKIP_RE = /<!--\s*deck:skip\s*-->[\s\S]*?<!--\s*\/deck:skip\s*-->/g;
export const NOTE_RE = /<!--\s*deck:note\s*-->([\s\S]*?)<!--\s*\/deck:note\s*-->/g;
export const COMMENT_RE = /<!--[\s\S]*?-->/g;
const HEADING_RE = /^(#{1,6})\s+(.*)$/gm;
const FENCE_RE = /^(```|~~~)/;

/** Parse `label="x" order="2"` style attributes off a tag body. */
export function attrs(s) {
  const out = {};
  for (const m of String(s || '').matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'slide';
}

/**
 * Headings outside fenced code blocks. A `# comment` line inside a bash fence is not a
 * heading, and treating it as one silently truncates the preceding slide.
 */
function headings(md) {
  const fenced = new Set();
  let open = false;
  let offset = 0;
  for (const line of md.split('\n')) {
    if (FENCE_RE.test(line)) open = !open;
    if (open) for (let i = offset; i < offset + line.length + 1; i++) fenced.add(i);
    offset += line.length + 1;
  }
  const out = [];
  for (const m of md.matchAll(HEADING_RE)) {
    if (fenced.has(m.index)) continue;
    out.push({
      level: m[1].length,
      title: m[2].trim(),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

/**
 * Collect the slides a document declares, in document order.
 *
 * A deck:slide tag attaches to the NEXT heading; the slide body is that heading's
 * section, running to the next heading of the same or higher level.
 *
 * A deck:image tag stands alone and is a whole slide: a finished 16:9 image, such as a
 * slide exported from another deck, with a title for the index, comments and address.
 * It needs no heading, because the image carries its own.
 *
 * @returns {({kind: 'content', title: string, label: string, body: string} |
 *            {kind: 'image', title: string, label: string, src: string, header: boolean})[]}
 */
export function collectSlides(md, { onWarn = () => {} } = {}) {
  const hs = headings(md);
  const slides = [];
  for (const tag of md.matchAll(IMAGE_RE)) {
    const a = attrs(tag[1]);
    if (!a.src) {
      onWarn(`deck:image tag at offset ${tag.index} has no src; skipped`);
      continue;
    }
    const title = a.title || a.label || a.src.split('/').pop().replace(/\.[^.]+$/, '');
    slides.push({
      kind: 'image', at: tag.index, title, label: a.label || title, src: a.src,
      header: a.header === 'true',
    });
  }
  for (const tag of md.matchAll(INCLUDE_RE)) {
    const a = attrs(tag[1]);
    if (!(a.src || a.deck) || !(a.section || a.slide)) {
      onWarn(`deck:include tag at offset ${tag.index} needs src or deck, and section or slide; skipped`);
      continue;
    }
    slides.push({
      kind: 'include', at: tag.index,
      src: a.src || '', deck: a.deck || '', section: a.section || '', slide: a.slide || '',
      title: a.title || '', label: a.label || a.title || '', header: a.header === 'true',
      ...('eyebrow' in a ? { eyebrow: a.eyebrow } : {}),
    });
  }
  for (const tag of md.matchAll(SLIDE_RE)) {
    const a = attrs(tag[1]);
    const h = hs.find((x) => x.start >= tag.index);
    if (!h) {
      onWarn(`deck:slide tag at offset ${tag.index} has no heading after it`);
      continue;
    }
    const next = hs.find((x) => x.start > h.start && x.level <= h.level);
    slides.push({
      kind: 'content',
      at: tag.index,
      title: a.title || h.title,
      ...('eyebrow' in a ? { eyebrow: a.eyebrow } : {}),
      label: a.label || h.title,
      body: md.slice(h.end, next ? next.start : md.length),
    });
  }
  return slides.sort((x, y) => x.at - y.at).map(({ at, ...s }) => s);
}

/**
 * One section of a document, found by its heading text, as the body a slide would have.
 * The match ignores case and surrounding space; the body runs to the next heading of the
 * same or higher level. Returns null when no heading matches.
 */
export function findSection(md, heading) {
  const want = String(heading).trim().toLowerCase();
  const hs = headings(md);
  const h = hs.find((x) => x.title.trim().toLowerCase() === want);
  if (!h) return null;
  const next = hs.find((x) => x.start > h.start && x.level <= h.level);
  return { title: h.title, body: md.slice(h.end, next ? next.start : md.length) };
}

/**
 * Every link reference definition in the document, as Markdown lines.
 *
 * Reference links, `[AIPLAT-47][AIPLAT-47]`, resolve against definitions that usually sit
 * at the foot of the document, outside any slide's section. A slide is rendered on its
 * own, so each one is given the whole set, or the link renders as its literal brackets.
 */
export function linkDefinitions(md) {
  const out = [];
  let open = false;
  for (const line of md.split('\n')) {
    if (FENCE_RE.test(line)) open = !open;
    if (!open && LINK_DEF_RE.test(line)) out.push(line.trim());
    LINK_DEF_RE.lastIndex = 0;
  }
  return out.join('\n');
}

/** The cover declaration, or null. */
export function collectCover(md) {
  const m = COVER_RE.exec(md);
  return m ? attrs(m[1]) : null;
}

/**
 * Strip doc-only content and all remaining comments; pull out presenter notes.
 * @returns {{body: string, notes: string[]}}
 */
export function slideBody(body) {
  const notes = [];
  let out = body.replace(SKIP_RE, '');
  out = out.replace(NOTE_RE, (_m, inner) => {
    notes.push(inner.trim());
    return '';
  });
  out = out.replace(COMMENT_RE, '');
  return { body: out.replace(/\n{3,}/g, '\n\n').trim(), notes };
}

/**
 * Rewrite local image references through `resolve`, which returns the new href or null
 * to leave the reference untouched. Keeps filesystem concerns out of this module.
 */
export function rewriteImages(body, resolve) {
  return body.replace(/!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (m, alt, href, rest) => {
    if (/^(https?:|data:|\/|#)/.test(href)) return m;
    const next = resolve(decodeURIComponent(href));
    return next ? `![${alt}](${next}${rest})` : m;
  });
}
