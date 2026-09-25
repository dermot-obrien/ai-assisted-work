<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are semantic, with the contract defined as: MAJOR for a changed skill `name`, a removed script, a changed CLI interface or a changed output shape; MINOR for new capabilities, themes or tags; PATCH for wording, fixes and documentation.

## [0.3.0] - 2026-09-26

### Added

- `deck:html`, a whole slide from a self-contained HTML file designed on the 1920x1080 canvas, for a layout Markdown cannot express. It is isolated in an iframe, so its styles and scripts cannot reach the deck, and forwards keys so navigation still works inside it. The files it loads, `src` and `poster` on any tag, `<link>` stylesheets and CSS `url(...)`, are copied into `assets/` and rewritten, so the deck opens from disk. A resource loaded from the network is warned about. `header="true"` and `eyebrow="..."` work as on `deck:image`. The PDF export waits for each frame, its images and fonts to load. `--partials` writes the rewritten file itself.
- Media in Markdown slides. `src` and `poster` on any HTML tag in a slide, such as `<video>`, `<audio>` or `<source>`, are copied into `assets/` like images, and a missing file is warned about as a file. Media over 50 MB is warned about (`mediaWarnBytes` changes the threshold).
- `rewriteResources` and `remoteResources` in `src/parse.mjs`.

## [0.2.0] - 2026-09-25

### Added

- `build --refresh`, which re-renders any image whose diagram changed since its render, through the sibling model skill, before building. A failed render fails the build.
- A `pdf` repository default and `deck_pdf` front matter, so `build` exports `deck.pdf` without `--pdf`; `--no-pdf` skips it. `publish` is unaffected. `build()` returns `pdf`, the resolved choice, for callers that export.
- `deck_eyebrow` front matter, the line above every slide title, falling back to `sidebar_label`; `""` turns it off. `eyebrow="..."` on `deck:slide` or `deck:include` overrides it for one slide. An included source is named by its `deck_eyebrow` first.
- Stale-render check. An image with a `<image>.render.json` record whose diagram has changed since the render is warned about, with the command that re-renders it, and fails the build when `CI` is set or `strictRenders` is true. `src/freshness.mjs` reads the record; it has no dependency on the renderer.
- `dependencies` in `manifest.json`: the documents and images each deck was built from, with each image's diagram and whether it is stale. `publish` returns them as `graph`, and `publish --graph` prints them with the sources shared between decks.
- A slide index on the left of `deck.html`: a numbered list of slide titles, click to jump, current slide highlighted and kept in view. It collapses from the « button in its header or with `I`, and reopens from the toolbar; its open state is remembered where the browser allows. On narrow screens it overlays the slide and starts closed.
- Thumbnails in the slide index, PowerPoint style, as an option. Titles only is the default. `--thumbnails` on `build`, or `deck_thumbnails: true` in the document's front matter, makes thumbnails the default for that deck; the Thumbnails and Titles button in the index header, or `T`, switches either way and the viewer's choice is remembered.
- Previous and Next buttons with a slide counter beneath the slide, disabled at either end, and a full-screen presenting button. `F` presents; presenting hides the index and the toolbar.
- The PDF export reports every slide it had to shrink below 60 percent, so a crowded slide is found before it reaches a projector.
- Per-slide review comments, opt in with `--comments` or `deck_comments: true`. One action sends them: Send review (N) appears only once a comment exists and opens a dialog for the reviewer's name, a summary and a single send button labelled by the configured sender, with Copy and Download as fallbacks, then offers to clear what was sent. The sender is looked up by `feedback.method`, email by default, so another backend needs no interface change. The first version put four equal buttons and a name field in the panel, which reviewers found unclear. A Comments panel on the right, `C` to toggle, collects comments against the current slide; the slide index shows a count per slide. Comments stay in the reviewer's browser until they send them: Email review opens their mail client addressed to `--feedback-to` (`deck_feedback_to`), Copy puts the review on the clipboard, and Download saves it as one Markdown file with a machine-readable JSON copy. A review too long for a mail link is copied or downloaded and the email says where to find it, rather than being cut off.
- Stable slide addresses. Each slide has an id from its label, and the address is `#interfaces` rather than `#6`, so a link or a comment still points at the right slide after slides are added or reordered. Numbered addresses still work.
- `--deck-id` (`deck_id`), the stable id that keys a reviewer's stored comments, and `--html-name`, so a deck can be written as `index.html` and served at its folder's URL.
- Repository defaults in `[suite.markdown-deck]` of `.agents/skill-bindings.toml`: `theme`, `comments`, `thumbnails`, `feedbackTo` and `feedbackSubject`, declared in `inputs.toml` so `model doctor --skill markdown-deck` checks them. A deck overrides any of them in front matter (`deck_theme`, `deck_comments`, `deck_thumbnails`, `deck_feedback_to`, `deck_feedback_subject`), and a command-line option overrides both. `bindings: false` ignores the repository.
- `deck:image`, a whole slide from a finished 16:9 image with a title, so slides exported from another deck as PNGs can be pulled in. It stands alone, needs no heading, and takes its place in document order. PNGs are checked from their header: not 16:9, or below 1920x1080, is warned about. `header="true"` draws the deck's header above the image instead.
- `markdown-deck publish <root> --out <dir>`: every document whose front matter says `deck_publish: true` built to `<dir>/<deck_id>/index.html`, with `--list`, `--skip`, `--reserved` and `--pdf`. `src/catalog.cjs` exposes the search as `findPublishedDecks`, and `menuItems` turns it into Docusaurus navbar dropdown items, grouped by `deck_menu`. CommonJS so a Docusaurus config can require it. Moved into the skill from the first repository that used it, so any workspace gets the same contract.
- `deck:include`, a section of another document rendered live as a slide, by `src` and `section`, or by a published `deck` id and `slide` id so moving the source does not break it. The slide is headed "From <source>", and its links and images resolve from the source. A target that cannot be found fails the build, listing what exists. An included section that is only an image is shown full-bleed, filling the canvas with a small source tag, since it is a picture of a slide; `header="true"` keeps the header layout.
- A published-deck registry, bound as `registry` in `[suite.markdown-deck]` or passed as `--registry`. `publish` records every deck URL it publishes, with its slide ids, and fails when a published one disappears until it is marked `retired` or `redirected`; a redirected deck gets a redirect page at its old URL. In CI, or with `--registry-check`, it only checks, so an uncommitted registry fails the deploy. Decks published another way can be passed as `external` and are protected too.
- A test suite under `tests/`, run with `npm test` on Node's built-in runner and no new dependency. Unit tests cover tag parsing, the deck's HTML shape and `build()`. Browser tests check the real layout in Edge, Chrome or Playwright's Chromium: 16:9 at several window sizes with the index open and closed, every slide fitted including hidden ones, margins and full width kept when shrunk, previous and next, the index in both views, collapse, and one 16:9 PDF page per slide. They skip, rather than fail, where no browser can be launched.
- Optional theme tokens for the chrome: `--index-width`, `--index-bg`, `--index-fg`, `--index-rule`, `--index-hover`, `--index-active`, `--toolbar-button`, `--toolbar-rule`, `--toolbar-hover`. Each falls back to an existing token, so current themes need no change.

### Fixed

- Reference links rendered as literal brackets, such as `[PROJ-48][PROJ-48]`. Their definitions usually sit at the foot of the document, outside every slide's section, and each slide is rendered on its own. Every slide now carries the document's link definitions. Found by building the FY27 Q1 plan on a page, the first deck built from a document not written as a reference architecture.
- Content ran off the bottom of PDF pages. Fitting measured only the slide on screen, and a hidden slide measures zero high, so every other slide reached the PDF unfitted and was cut off. Every slide is now fitted, hidden ones included, and fitted again under the print layout before export.
- Fitted slides ran into their bottom margin, because the available height was measured including the body's padding.
- A slide shrunk to fit became a narrow column in the middle of a wide slide. Content is now widened before it is shrunk, and the largest scale that fits is found by search, so a shrunk slide still spans the full width.
- Slides were fitted before web fonts and images had loaded, so a late image could push content off the slide. Fitting reruns on load, on each image, on fonts ready and after mermaid renders.
- Images are centred, and a slide holding only a diagram gives it the full body height instead of capping it at 720px.
- The 16:9 canvas is now placed in an explicitly sized frame rather than centred by flexbox, which could crop a slide larger than its container.

## [0.1.0] - 2026-09-25

First release.

### Added

- `deck:cover`, `deck:slide`, `deck:skip` and `deck:note` tags, expressed as HTML comments so the source document stays readable wherever Markdown renders.
- `markdown-deck build`, producing a self-contained `deck.html` with keyboard navigation, a `manifest.json`, and an `assets/` folder for local images.
- `markdown-deck pdf`, using an already-installed browser in preference to downloading Chromium. On Windows the bundled Edge is used, then Chrome, then Playwright's Chromium.
- Themes as CSS token files. `default` is brand-free and `themes/_base.css` holds the layout, naming no colour. An organisation sets its own colours with a `palette` binding rather than a theme file in the skill.
- `scripts/sync-to-claude.mjs`, the one adapter needed because Claude Code reads `.claude/skills` rather than `.agents/skills`. Has a `--check` mode for a pre-commit hook or CI.
- `scripts/pack-repo.mjs`, which assembles the standalone publishable repository including Claude Code plugin and marketplace manifests.
