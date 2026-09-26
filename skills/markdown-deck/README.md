<!-- SPDX-License-Identifier: Apache-2.0 -->

# markdown-deck

An agent skill that turns tagged sections of one Markdown document into HTML slides and a PDF, keeping the Markdown as the only source.

The tags are HTML comments, so the document still reads as a document wherever Markdown renders. Untagged sections stay document-only, which is how one file carries more detail than the deck shows.

Standalone: no dependency on any host repository. Every path the CLI touches comes from its arguments.

## Install

### Any agent (recommended)

```bash
gh skill install OWNER/markdown-deck markdown-deck --scope user
# --agent claude-code|cursor|codex|copilot|gemini-cli targets one host
# --pin v0.1.0 locks the version
```

```bash
npx skills add OWNER/markdown-deck/skills/markdown-deck
```

### Claude Code, as a plugin

The only route that resolves skill dependencies automatically.

```
/plugin marketplace add OWNER/markdown-deck
/plugin install markdown-deck@OWNER-skills
```

### Gemini CLI

```bash
gemini skills install https://github.com/OWNER/markdown-deck.git --path skills/markdown-deck --scope user --consent
```

### Pinned and auditable

For a regulated or air-gapped consumer who needs an exact commit in their own repository:

```bash
git subtree add --prefix .agents/skills/markdown-deck   https://github.com/OWNER/markdown-deck v0.1.0 --squash
```

### Manual

Copy `skills/markdown-deck/` into whichever directory your tool reads:

| Directory | Tools that read it |
|---|---|
| `.agents/skills/` | Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, Amp, Zed, Windsurf, Cline |
| `.claude/skills/` | Claude Code only |

User-level installs use `~/.agents/skills/` and `~/.claude/skills/`.

### The Claude Code bridge

Claude Code does not read anything under `.agents/`, so a repository that keeps the canonical copy at `.agents/skills/` needs a projection:

Either use `gh skill install --agent claude-code`, or copy the directory into `.claude/skills/` as part of your build. Treat `.claude/skills/` as a build output. Copy rather than symlink: symlinks need developer mode or admin on Windows, need `core.symlinks` set in git, and are not resolved by every tool.

### As a CLI

The skill is also a normal npm package, so any agent or human can shell out to it regardless of which tool is driving:

```bash
npm install
node bin/markdown-deck.mjs build path/to/doc.md --out dist --pdf
```

PDF export needs `npm install playwright`. On Windows no browser download is required; the exporter uses the Edge that ships with the OS, then Chrome, then bundled Chromium. Override with `MARKDOWN_DECK_CHANNEL` or `MARKDOWN_DECK_BROWSER`.

## Usage

Tag the document:

```markdown
# Knowledge Retrieval

<!-- deck:cover subtitle="How one document becomes a deck" -->

<!-- deck:slide label="Why grounding" -->

## Why grounding matters

Grounding is the largest single lever on answer accuracy.

<!-- deck:skip -->
Detail that belongs in the document but not on the slide.
<!-- /deck:skip -->

## Not a slide

No tag, so this stays document-only.
```

Build it:

```bash
node bin/markdown-deck.mjs build doc.md --out dist --theme default --pdf
```

Outputs `dist/deck.html` (self-contained, a collapsible slide index of titles, or thumbnails with `--thumbnails`, previous and next controls, keyboard navigation, full-screen presenting, print stylesheet), `dist/manifest.json`, `dist/assets/` for any local images, and `dist/deck.pdf` with `--pdf`, or by default where the repository binds `pdf = true`. `publish` exports PDFs only with its own `--pdf`, whatever the binding says, so a site build does not start needing a browser.

Run the worked example:

```bash
npm run example
```

## Themes

`themes/_base.css` holds the layout and never names a colour. A theme is a token file:

```css
:root {
  --slide-bg: #ffffff;
  --heading: #14507a;
  --accent: #7aa7c7;
  /* ... */
}
```

`default` is brand-free. Pass a name or a path: `--theme ./themes/mine.css`.

For an organisation's own colours, prefer a **palette** over a theme file. Set the tokens in
`[suite.markdown-deck.palette]` of the repository's `.agents/skill-bindings.toml` and they
override whichever theme is chosen, so the layout stays with the skill and the brand stays
with the organisation:

```toml
[suite.markdown-deck]
theme = "default"

[suite.markdown-deck.palette]
heading  = "#143a5a"
accent   = "#2f8f83"
cover-bg = "#0b2438"
```

Keys are token names without the `--` prefix. An unknown key fails the build rather than being
quietly ignored, because a typo in a colour is otherwise invisible. A single deck overrides the
repository palette with `deck_palette` in its front matter.

## Layout

Installed (the portable payload):

```
markdown-deck/
├── SKILL.md            the skill definition, Agent Skills format
├── LICENSE             duplicated inside the payload so a copied dir is self-sufficient
├── package.json        npm package, exposes the markdown-deck bin
├── bin/markdown-deck.mjs
├── src/
│   ├── index.mjs       build(), the library entry point
│   ├── parse.mjs       tag parsing, pure functions over strings
│   ├── render.mjs      markdown to slide HTML
│   └── pdf.mjs         HTML to PDF, playwright loaded dynamically
├── scripts/pack-repo.mjs    assemble the publishable repository
├── themes/
└── examples/
```

Published (run `node scripts/pack-repo.mjs --owner <you>` to assemble it):

```
markdown-deck/
├── skills/markdown-deck/      the payload above, verbatim
├── .claude-plugin/
│   ├── plugin.json            Claude Code plugin, carries dependencies[]
│   └── marketplace.json
├── LICENSES/Apache-2.0.txt    REUSE layout
├── LICENSE
├── CHANGELOG.md
└── README.md
```

The payload is nested under `skills/` so that repository scaffolding stays out of the directory that lands in every consumer's context window, and because `gh skill`, `npx skills` and `gemini skills install --path` all resolve that subpath natively.

## Dependencies

markdown-deck has no skill dependencies. If it gains one, the convention is:

```yaml
metadata:
  x-skill-requires: "some-skill@^1.2.0"
```

plus a Prerequisites table in `SKILL.md` and an explicit instruction telling the agent to stop if the required skill is absent. No tool resolves skill-to-skill dependencies today except the Claude Code plugin route, where the same requirement is repeated in `plugin.json` under `dependencies`. The prose instruction is what actually enforces it at runtime.

## Repository defaults

Set once per repository in `[suite.markdown-deck]` of `.agents/skill-bindings.toml`, the file that binds the skill suite to a repository:

```toml
[suite.markdown-deck]
theme      = "default"
comments   = true
feedbackTo = "reviews@example.com"
```

| Binding | Deck front matter overriding it | Option overriding both |
|---|---|---|
| `theme` | `deck_theme` | `--theme` |
| `comments` | `deck_comments` | `--comments` |
| `thumbnails` | `deck_thumbnails` | `--thumbnails` |
| `feedbackTo` | `deck_feedback_to` | `--feedback-to` |
| `feedbackSubject` | `deck_feedback_subject` | `--feedback-subject` |
| `pdf` | `deck_pdf` | `--pdf`, `--no-pdf` |
| `tableRows` | `deck_table_rows` | `--table-rows` |
| `mermaid` | | `--mermaid` |

The nearest binding file above the document is used, so a deck built from anywhere in the repository gets the same defaults. An address containing an apostrophe needs a double-quoted TOML string, and double quotes in YAML front matter.

### Mermaid

A deck with a mermaid diagram needs mermaid in the browser. A deck is meant to open from disk and on networks that block a CDN, so the build copies `mermaid.min.js` into `assets/` from the nearest `node_modules/mermaid` above the document, or the skill's own, and loads it from there. With none installed it loads mermaid from the jsDelivr CDN. The `mermaid` binding, or `--mermaid`, names a file to copy or a URL to load instead; a binding path resolves against the binding file. Diagrams are drawn with every slide laid out invisibly, because mermaid sizes its boxes from measured text and text on a hidden slide measures nothing. Notes are drawn as light boxes with dark text from the theme tokens, because mermaid sometimes sizes a note slightly narrower than its text and the overflow must stay readable.

## Review comments

`--comments` adds a panel for comments per slide, like PowerPoint's. Reviewers add, edit and delete comments against the slide they are on, and the slide index shows how many each slide has. Comments are kept in the reviewer's own browser, keyed by the deck id, until the reviewer sends them.

The flow has one action. Until there is a comment, the panel says only how a review works. Once there is one, a single Send review (N) button appears. It opens a short dialog: the reviewer's name, a summary of what will be sent, and one send button whose wording comes from the configured sender, Send by email today. Copy and Download sit beneath it as fallbacks. After sending, the dialog asks whether to clear the sent comments, because the page cannot know an email actually went. Discard all, for comments never sent, is a separate small link that asks first.

| Sender | What it does |
|---|---|
| Email, the default | Opens the mail client, addressed to `--feedback-to`, with the review grouped by slide in deck order, each slide linked. A review too long for a mail link is copied to the clipboard, or downloaded, and the email says where it is |
| Copy (fallback) | Puts the review, with a JSON copy, on the clipboard |
| Download (fallback) | Saves `review-<deck-id>-<date>.md`: the review plus a JSON copy for tooling |

The interface never names the backend. Senders are looked up by `feedback.method` in the deck's embedded config, so a new backend, a Power Automate flow or a pre-filled form, is one more entry in the page script's sender table and a different method, with no change to the panel or dialog.

## Including slides from other documents

`<!-- deck:include src="../methodology/playbook.md" section="Stage 1: budget" -->` places a section of another document in this deck as a slide, rendered at build time in this deck's theme, so it is always current. The source does not have to be a deck. Its heading becomes the slide title, unless `title="..."` renames it, and the slide's eyebrow reads "From <source title>". Links and images resolve from the source document.

| Attribute | Meaning |
|---|---|
| `src` | The source document, relative to this one |
| `deck` | Instead of `src`: a published deck, by its `deck_id`, found in the workspace. It survives the source being moved |
| `section` | The heading to take, matched ignoring case. The section runs to the next heading of the same or higher level |
| `slide` | Instead of `section`: a slide the source already tags, by its slide id |
| `title`, `label` | Rename the slide, and its entry in the index |
| `eyebrow` | Replace the "From <source>" line; `eyebrow=""` removes it |

A section that is nothing but an image, such as a diagram slide from another deck, is shown as a full-bleed image slide: the image fills the whole 16:9 canvas, and a small "From <source>" tag sits in the corner instead of a header. `header="true"` keeps the header layout instead.

A missing file, deck, section or slide fails the build, and the message lists what does exist. `markdown-deck publish` reports it against the deck and still builds the others.

The source is named by its `deck_eyebrow`, then its `sidebar_label`, then its `title`. The same `deck_eyebrow` sets the line above every slide title in the source's own deck, so a resourcing document with `deck_eyebrow: "FY27 Q1 Resourcing"` reads that way in its own deck and as "From FY27 Q1 Resourcing" in any deck that includes it.

## Designed slides in HTML

Some slides are designed rather than written: a hand-laid diagram, a styled comparison, an animation. `<!-- deck:html src="./slides/roadmap.html" title="Roadmap" -->` makes a whole slide from a self-contained HTML file drawn on the 1920x1080 canvas. It stands alone, needs no heading and takes its place in document order, like `deck:image`, and it keeps working HTML, scripts and animation where an image would not.

The file is isolated in a frame, so its styles and scripts cannot reach the deck or another slide, and the deck still provides the index, navigation, comments, thumbnails and PDF. Keys pressed inside the frame are passed to the deck, so the arrow keys still move between slides. The files it loads, `src` and `poster` on any tag, stylesheet links and CSS `url(...)`, are copied into `assets/` with the paths rewritten, so the deck still opens from disk with no server. Anything it loads from the network is warned about. `header="true"` puts the deck's own header above the frame, and `eyebrow="..."` sets its eyebrow.

The same copying applies to video, audio and their posters written as HTML in an ordinary Markdown slide. Media over 50 MB is warned about.

Keep the document the source of truth: prefer Markdown, and reserve an HTML slide for a slide whose design is the point, because its text is not in the document.

## Section dividers

`<!-- deck:divider -->` before a heading makes a divider slide titled by that heading: the title large on the cover's ground, with nothing else, to mark where one part of a deck ends and the next begins. The heading's own body stays in the document and does not reach the divider. Put the tag before a heading that groups slides, such as an H2 whose H3s are tagged, rather than before every slide.

| Attribute | Meaning |
|---|---|
| `title` | The divider's title. With a title the tag stands alone, anywhere, and needs no heading |
| `subtitle` | A line under the title |
| `eyebrow` | A small line above the title, such as "Part 2". Dividers never inherit the deck's eyebrow |
| `label` | The divider's entry in the index, and its id |

A divider uses the cover's colours. A theme or palette gives dividers their own with `--divider-bg`, `--divider-fg`, `--divider-accent` and `--divider-muted`.

## Long tables

A table longer than twelve rows is split rather than shrunk. It continues on the next slide with its header row repeated, and the rows are spread evenly, so 26 rows become 9, 9 and 8 rather than 12, 12 and 2. The slides are titled "Interfaces (1 of 3)", "(2 of 3)" and so on; the first keeps the section's id, `#interfaces`, so links to it still land, and the rest are `#interfaces-2` and `#interfaces-3`. Text before the table stays on the slide where the table starts, text after it follows the last rows, and presenter notes stay on the first slide.

Change the limit for one slide with `table-rows="20"` on its `deck:slide` tag, for a deck with `deck_table_rows` in its front matter, for a repository with `tableRows` in its bindings, or for one build with `--table-rows`. `0` turns splitting off everywhere it is set, leaving a long table to shrink to fit as before. A table inside a code fence is never split.

## Stale renders and dependencies

An image rendered from a diagram goes out of date silently when the diagram changes. A renderer that follows the convention leaves `<image>.render.json` beside the image, naming the source and a SHA-256 of it with line endings normalised; the model skill's `render` writes one. When a deck uses an image with a record and the diagram no longer matches, the build warns and prints the command that re-renders it. With `CI` set, or `strictRenders: true`, it fails. `build --refresh` (`refresh: true`) re-renders a stale image through the model skill installed beside this one before using it, and fails if the render does. An image without a record is not checked.

Every `manifest.json` lists `dependencies.documents`, the source and every included document, and `dependencies.images`, each with its diagram and a `stale` flag where it has a record. Paths are relative to the workspace root. `markdown-deck publish --graph` prints this for every deck, then every document or diagram used by more than one deck.

There is no build order between decks, and none is needed: an include reads the source document, not a built deck, so decks can be built in any order. The dependency that does need ordering is a diagram and its render, which is what the stale check covers.

## Publishing a workspace

A document publishes itself. Front matter decides whether it becomes a deck and where it sits in a site menu:

```yaml
deck_publish: true                        # publish it
deck_id: fy27-q1-plan                     # permanent URL /decks/<id>/; required
deck_menu: "Planning / FY27"              # menu group; omit for the top level
deck_menu_label: "FY27 Q1 Plan"           # optional; defaults to the title
deck_menu_order: 10                       # optional; lower first within its group
```

`deck_id` is required rather than derived, so renaming or moving the document never changes the URL. It must be lower-case-hyphenated.

Build every such document in a workspace, each to `<dir>/<deck_id>/index.html`:

```sh
node bin/markdown-deck.mjs publish <root> --out <dir> [--list] [--pdf] [--skip a,b/c] [--reserved id,id]
```

`--list` shows what would be published without building. Hidden folders, `node_modules`, `build`, `dist` and `.docusaurus` are never searched, and neither is `<dir>`; `--skip` adds more, by name or root-relative path. `--reserved` names ids something else already serves. A deck that asks to be published but cannot be, with a missing, malformed, duplicate or reserved id, or no `deck:` tags, is reported and fails the command rather than disappearing.

From code, `publishAll(root, { out, skip, reserved })` in `src/publish.mjs` does the same, and `src/catalog.cjs` exposes the search on its own as `findPublishedDecks(root, { skip, reserved })`.

### Published-deck registry

A deck URL is stable only while its `deck_id` does not change. The registry makes that a check rather than a convention. Bind it in `[suite.markdown-deck]`, or pass `--registry <file>`:

```toml
registry = "../site/decks/published-decks.json"
```

Every publish then compares what it builds with every deck URL ever published, recorded in that file:

| Situation | Result |
|---|---|
| A new deck | Recorded, with its slide ids. Commit the file |
| A published deck that is gone, because its id changed, its document was deleted or `deck_publish` turned off | The publish fails, naming the deck |
| An entry marked `"status": "retired"` | Allowed to be gone |
| An entry marked `"status": "redirected"` with `"redirect": "<deck_id>"` | A redirect page is written at the old URL, carrying the slide address across |
| A slide id that disappears | A warning: links to that slide now open the deck at its start |

With `--registry-check`, or when the `CI` environment variable is set, the registry is only checked: a deck it does not know is a failure rather than being recorded, so an uncommitted registry is caught before deploy. `publishAll` takes `external` decks, published some other way, which the registry then protects too.

### In a Docusaurus site

Run `publish` before `docusaurus build`, into a folder Docusaurus serves as static files, then let the config build the menu from the same front matter:

```json
"build": "node <skills>/markdown-deck/bin/markdown-deck.mjs publish . --out static/decks && docusaurus build"
```

```js
// docusaurus.config.js
const {findPublishedDecks, menuItems} = require('<skills>/markdown-deck/src/catalog.cjs');
const decks = findPublishedDecks(__dirname, {skip: ['static']}).decks;
// ...
navbar: { items: [{ type: 'dropdown', label: 'Decks', position: 'left', items: menuItems(decks) }] }
```

`menuItems` returns dropdown items. A dropdown cannot nest, so a menu path becomes one group heading, `Planning › FY27` for a deeper one, with its decks beneath; top-level decks come first. Style the headings with the `deck-menu-group` class and the decks under them with `deck-menu-item`. Entries from another source can be merged in, as objects with `id`, `label`, `menu` and `order`, and an `href` to override the URL. `menuItems(decks, { base: 'slides' })` serves them under `/slides/` instead.

A site that renders `.md` as MDX must treat it as CommonMark instead, or the `deck:` comments are a build error: `markdown: { format: 'detect' }`.

## Testing

```sh
npm test
```

Node's built-in test runner, no extra dependency. `tests/parse`, `tests/render` and `tests/build` need nothing else. `tests/browser` drives a real browser to check what a unit test cannot: that the canvas is 16:9 at any window size, that every slide is fitted including the ones not on screen, and that the PDF has one 16:9 page per slide. It uses Edge, then Chrome, then Playwright's Chromium, or `MARKDOWN_DECK_BROWSER`, and skips where none can be launched.

## Compatibility notes

`SKILL.md` carries only the five fields the Agent Skills specification defines: `name`, `description`, `license`, `compatibility`, `metadata`. Tool-specific frontmatter is deliberately absent, because several tools reject unknown fields on upload and none of them mean the same thing across implementations. Any tool-specific behaviour belongs in an overlay applied at install time, not in this file.

## Licence

Apache-2.0. See [LICENSE](./LICENSE).
