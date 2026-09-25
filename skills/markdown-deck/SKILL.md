---
name: markdown-deck
description: Render tagged sections of a Markdown document into HTML slides and a PDF, keeping the Markdown as the only source. Use when asked to make a deck or slides from a document or page, turn a document into a presentation, generate a PDF of slides, add deck tags to a document, or regenerate a deck that has drifted from its source.
license: Apache-2.0
compatibility: Node.js 18 or newer. PDF export additionally needs playwright and a Chromium-family browser; on Windows the bundled Edge is used automatically.
metadata:
  version: "0.4.1"
  homepage: https://github.com/OWNER/markdown-deck
  requires-skills: ""
---

# Markdown Deck

Turn tagged sections of one Markdown document into an HTML deck and a PDF, without creating a second copy of the content.

The document stays the source of truth. Tags are HTML comments, so the file still reads as a normal document wherever Markdown renders, and untagged sections stay document-only. Slide boundaries never use a `---` ruler, because a ruler is visible in the rendered document.

## Tag vocabulary

| Tag | Placement | Effect |
|---|---|---|
| `<!-- deck:cover subtitle="..." date="..." footnote="..." -->` | Anywhere, usually after the H1 | Produces the cover slide |
| `<!-- deck:slide label="..." -->` | Immediately before a heading | That heading's section becomes one slide, running to the next heading of the same or higher level |
| `<!-- deck:image src="./slide.png" title="..." -->` | On its own line, anywhere | A whole slide from a finished 16:9 image, such as a slide exported from another deck. The title labels it in the index, comments and address; the image is not overdrawn. Add `header="true"` to put the deck's own header above the image instead |
| `<!-- deck:html src="./slide.html" title="..." -->` | On its own line, anywhere | A whole slide from a self-contained HTML file designed on the 1920x1080 canvas, for a layout Markdown cannot express. It is isolated in a frame, so its styles and scripts cannot reach the deck; the deck still provides the index, navigation, comments and PDF. `header="true"` puts the deck's header above it |
| `<!-- deck:include src="../other.md" section="Heading" -->` | On its own line, anywhere | A section of another document, rendered live in this deck's theme and headed "From <source>". `deck="<deck_id>"` finds a published deck by id instead of `src`, so moving it does not break the include; `slide="<slide-id>"` takes one of its tagged slides instead of `section`; `title="..."` renames it. A target that cannot be found fails the build |
| `<!-- deck:skip -->` ... `<!-- /deck:skip -->` | Inside a tagged section | Kept in the document, dropped from the slide |
| `<!-- deck:note -->` ... `<!-- /deck:note -->` | Inside a tagged section | Becomes presenter notes, never rendered on screen or in the PDF |

Rules that matter:

- The tag attaches to the NEXT heading, not the preceding one. Put it on its own line with a blank line either side.
- Tag a heading whose section has content. Tagging one whose body is only guidance comments produces an empty slide; the tool warns and skips it.
- The slide title is the heading text. Override with `title="..."` on the tag.
- A slide needing more than about twelve lines of body is too dense. Split the section, or move the overflow into `deck:skip`.
- An image slide should be a PNG at 1920x1080 or larger in 16:9. The build warns when one is not 16:9, which is letterboxed, or is smaller than 1920x1080, which looks soft when presented. A missing image slide is warned about and skipped.
- Reference links, `[text][label]` with `[label]: url` at the foot of the document, resolve on every slide. Relative links to other documents are not rewritten, so they only work where the deck sits beside those documents.
- Local images are copied into the output `assets/` folder and the paths rewritten. A missing image is warned about and left alone rather than failing the build.
- Video, audio and other files a slide loads are copied the same way: `src` and `poster` on any tag in a Markdown slide, and in an HTML slide also stylesheet links and CSS `url(...)`. Media over 50 MB is warned about; compress it or link to it instead.
- Prefer Markdown. Use `deck:html` only for a slide whose design is the point, such as a hand-laid diagram or a styled comparison, because its text is not in the document. An HTML slide that loads anything from the network, such as web fonts or a script from a CDN, is warned about, since the deck is meant to open from disk; copy the file in beside it instead. A missing HTML slide is warned about and skipped.
- An image with a `<image>.render.json` record, as `model render` writes, is checked against its diagram. If the diagram changed after the render, the build warns and gives the command that re-renders it; with `CI` set it fails. Re-render rather than suppress it; `--refresh` on `build` re-renders stale images itself, through the model skill, before building.
- `manifest.json` lists `dependencies`: the documents and images the deck was built from, relative to the workspace root. `publish --graph` prints them for every deck, with anything used by more than one deck, so the reach of a change is visible.

## Procedure

### 1. Check the host renders HTML comments

Most Markdown renderers drop HTML comments silently, which is what makes the tags invisible. The exception worth checking is MDX: MDX v2 and v3 removed HTML comment support, so a Docusaurus site must set `markdown.format` to `detect` for `.md` files, or the tags become a build error. If the document is served by an MDX-based site, confirm that before adding tags.

### 2. Add the tags

Read the document and choose the sections an audience needs, typically six to twelve. Add `deck:cover` near the H1 and `deck:slide` before each chosen heading. Move detail the audience does not need inside `deck:skip` rather than deleting it.

### 3. Build

From the skill directory, or anywhere if it is installed globally:

```bash
node bin/markdown-deck.mjs build <input.md> --out <dir> --theme default
```

Useful options: `--theme` takes a built-in name or a path to a `.css` file, `--pdf` also exports `deck.pdf` and `--no-pdf` skips it, `--partials` also writes `slides/*.html` fragments for hosts that embed them, and `--eyebrow`, `--subtitle`, `--date`, `--footnote`, `--logo` fill the chrome. The eyebrow, the small line above each slide title, is `deck_eyebrow` in front matter, falling back to `sidebar_label`; `deck_eyebrow: ""` turns it off, and `eyebrow="..."` on a `deck:slide` or `deck:include` tag overrides it for one slide. Run `node bin/markdown-deck.mjs themes` to list themes, and `--help` for everything.

First run in a fresh clone needs `npm install` in the skill directory. PDF export additionally needs `npm install playwright`; no browser download is required on Windows because Edge is used through `--channel msedge`, falling back to Chrome then bundled Chromium.

### 4. Verify

Open `deck.html`. The slide index down the left lists slide titles; click one to jump to it, and collapse the index with « in its header. Previous and Next sit beneath the slide, the arrow keys do the same, `I` toggles the index, `T` switches it between titles and thumbnails, and `F` presents full screen. Titles is the default; pass `--thumbnails`, or set `deck_thumbnails: true` in the front matter, to open with PowerPoint-style thumbnails instead. Check that no slide body is empty and that images resolved. Then confirm `deck.pdf` exists and is non-zero if it was requested.

Repository-wide defaults live in `[suite.markdown-deck]` of `.agents/skill-bindings.toml`: `theme`, `comments`, `thumbnails`, `feedbackTo`, `feedbackSubject`, and `pdf`, which makes `build` export the PDF without `--pdf`. A deck overrides any of them in its front matter with the `deck_` form of the key, and a command-line option overrides both. Run `python <skills>/model/bin/model.py doctor --skill markdown-deck` to see what a repository has set.

For review, build with `--comments` (or `deck_comments: true`) and `--feedback-to <address>` (or `deck_feedback_to`). Reviewers comment per slide in a panel on the right, `C` to toggle; nothing leaves their browser until they choose Email review, Copy or Download. Give the deck a stable `deck_id`, because stored comments are keyed by it. Slide addresses are ids such as `#interfaces`, so links survive reordering.

Every slide is a fixed 1920x1080 canvas, so the HTML and the PDF are always 16:9. Content taller than the slide is shrunk to fit, widening first so the result still spans the slide. The PDF export reports any slide shrunk below 60 percent; split it, or move detail into `deck:skip`, rather than accept small type on a projector.

### 5. Publish a workspace, when asked

To publish documents as decks on a site, each document sets `deck_publish: true` and a lower-case-hyphenated `deck_id` in its front matter, and optionally `deck_menu`, `deck_menu_label` and `deck_menu_order` to place it in a site menu. Then:

```bash
node bin/markdown-deck.mjs publish <root> --out <site-static-dir>/decks --list
node bin/markdown-deck.mjs publish <root> --out <site-static-dir>/decks
```

If the workspace binds a `registry` in `[suite.markdown-deck]`, publish also records every deck URL and fails when one that was published disappears. Tell the user to commit the registry file when it reports new decks, and to mark a deck `retired` or `redirected` there rather than deleting its entry. In CI it only checks.

Run `--list` first and read it. A problem it reports, such as a missing `deck_id`, fails the build; fix the document rather than removing `deck_publish`. For a Docusaurus menu, `src/catalog.cjs` exports `findPublishedDecks` and `menuItems`; the README shows the wiring.

## Reporting back

Say how many slides were produced, name any section that was skipped and why, and give the output paths. Do not claim the PDF exists without checking the file is present and non-zero.

## Authoring the source document

Write the document first and tag it second. A document written to be a deck reads badly as a document, and the document is the artefact that outlives the meeting.

Prefer tables over bullet lists for anything comparative; the theme styles them for projection. Keep mermaid fences if the host renders them, because the deck renders them too. It copies an installed mermaid beside the deck, so diagrams draw offline; with none installed it loads mermaid from the CDN, and `mermaid` in the repository bindings, or `--mermaid`, names a file or URL instead.

## Extending

Themes are plain CSS token files in `themes/`. Copy `themes/default.css`, change the custom properties, and pass the path to `--theme`. `themes/_base.css` holds the layout and never names a colour, so a new theme is about thirty lines.
