---
name: model
description: Treat a diagram and a document as two views of one model of boxes and lines. Extract a model from Markdown tables, draw.io, JSON or YAML; emit it to any of those; validate one representation against another to catch a re-pointed arrow or an undrawn row; and render draw.io layers to SVG, PNG or PDF. Use when asked to generate a diagram from a table, check a diagram matches its document, export a diagram, list a diagram's layers, or convert a model between formats.
license: Apache-2.0
compatibility: Python 3.9 or newer; Python 3.11 or newer to read a binding file. Rendering needs draw.io desktop installed (the installed build, not the portable exe). Reading YAML needs PyYAML; writing YAML needs nothing.
metadata:
  version: "0.4.1"
  x-skill-requires: ""
---

# model

One model, several representations. Markdown tables, a draw.io diagram, JSON and YAML are projections of the same boxes and lines, and this skill moves between them and checks that they agree.

Nothing here knows what the boxes mean. An architecture pattern, a network topology, a process flow and a data lineage are all the same shape. Domain vocabulary lives in the project's binding file, never in the skill.

## Which representation owns what

| Representation | Owns | Why |
|---|---|---|
| Markdown tables | What exists, and what connects to what | The document is the thing people read and review |
| draw.io | Geometry: position, routing, styling | Nothing else can hold layout, and layout is human judgement |
| JSON, YAML, CSV | Nothing | Derived projections, for tooling and for diffing |

Do not maintain two sources. Derive the others.

## Commands

Run from the skill directory. No installation is needed; `bin/model.py` puts `src` on the path itself.

```bash
python bin/model.py doctor           [--skill NAME] [--json]
python bin/model.py extract <file>   --format json|yaml|csv [--out FILE]
python bin/model.py emit    <file>   --to drawio|markdown|json|yaml|csv --out FILE [--force]
python bin/model.py validate <file>  [--against OTHER] [--json] [--fail-on error|warn|never]
python bin/model.py sync <doc> <drawio> [--prune] [--dry-run] [--adopt]
python bin/model.py rename  <doc> OLD NEW [--drawio FILE] [--dry-run]
python bin/model.py scan    <folder> [--recursive] [--json] [--fail-on error|warn|never]
python bin/model.py render  <drawio> --out FILE [--format svg|png|pdf] [--layer NAME ...] [--theme light|dark|auto]
python bin/model.py layers  <drawio> [--json]
python bin/model.py animate <doc>    [--out FILE] [--image PNG] [--accent #RRGGBB] [--interval S] [--force]
```

`extract`, `emit` and `validate` take any representation and work it out from the extension.

Exit codes: 0 success, 1 validation failed at or above the threshold, 2 usage or input error, 3 an external tool was missing or failed.

## Several models in one folder

A document declares its diagram in front matter. That declaration is what makes the two a pair, so a folder can hold several models side by side, such as a pattern and two alternative views of the same space:

```yaml
model:
  diagram: components.drawio
```

`scan <folder>` finds every document that declares one, validates each against its diagram, and lists the views a publish step renders: `<stem>.svg` for the structure layer and `<stem>-s1.svg` onward for each scenario layer, so two models never write the same file. `validate <doc>` uses the declared diagram when `--against` is not given. Documents that declare nothing are listed as skipped, not guessed at.

## Local and catalogued identifiers

A model can mix identifiers the catalogue knows with local ones for boxes it does not know yet. The binding says what a local id looks like: `local_pattern = '[0-9]{1,3}'` makes them plain numbers, `01 Gateway`, which is the usual choice; `local_prefix = "LOC-"` reserves a prefix instead. A local id must lead its table cell, so a number inside a name, as in `Microsoft 365 Copilot`, is never read as one.

| Identifier | Checked for | draw.io attribute |
|---|---|---|
| Local, `01` | Unique within the document; a row in the mapping table when mappings are kept | `local_attr`, default `local_id`. Its cell id is `local-01`, because draw.io's own cells `0` and `1` would otherwise collide with local nodes `0` and `1` |
| Catalogued, `ABB-017` | Present in the declared catalogue | The `node_id_attrs` entry named for its prefix, so `SBB-108.6` goes in `sbb_id` |
| Neither | Reported as `id_unmatched`, never dropped | none |

Local ids are scoped to their document; `scan` reports them as `doc.md#01`. Each local node needs a row in a `## Catalogue Mapping` table saying what it realises, partly covers, or leaves as a gap:

| Local ID | Maps To | Relationship |
|---|---|---|
| 01 | ABB-105 Enterprise RAG Pipeline | partial |
| 02 | gap | gap |

The relationship is one of `realises`, `partial` or `gap`. A gap names no target, anything else names a catalogued one, and a local node that realises a block drawn beside it is flagged, because that is one concept drawn twice.

When the catalogue gains the entry, `rename <doc> 01 ABB-106` promotes it: the identifier in the document, the attribute on the shape, the cell id and every reference to it, overlay assertions and labels. Front matter is never touched, and a plain-number id is replaced only where it leads a table cell, so the same number in prose or a date is left alone. The mapping row goes, because a catalogued node is its own mapping. It refuses to rename onto an id already in use.

## Abstraction, derived rather than declared

How abstract a model is follows from its boxes, so `validate` reports it rather than asking anyone to maintain it: `index.md: 12 nodes, 12 edges, 2 scenarios; abstraction conceptual`, and `"abstraction"` in `--json`.

| A box counts as | When |
|---|---|
| Conceptual | Its id is local, or its kind is `local` or `conceptual` |
| Logical | It comes from a catalogue declared with `level = "logical"`, or its kind is `logical` |
| Physical | It comes from a catalogue declared with `level = "physical"`, or its kind is `product` or `physical` |
| Nothing | Its kind is `external` or `context`: outside the model's scope, shown for context |
| Unknown | None of the above, for example a catalogue declared without a level |

The model is then conceptual if every counted box is conceptual, logical if the boxes are logical with or without conceptual ones, physical if every box is physical, and mixed otherwise, including when any box is unknown. A kind comes from a table's `kind` column, when the binding maps one, and wins over the identifier. The levels are generic: they say nothing about what the model is for, which is why one model of boxes, lines and walkthroughs can serve as an architecture pattern at any scope, from one problem to a whole domain, with any mix of boxes in either.

## Bringing a hand-drawn diagram into a model

`sync --adopt` tags shapes that carry no identifier but whose label names a row, instead of adding new shapes beside them. A match is exact after normalising case, whitespace and markup, against the whole label, its first line, or its leading bold run, so `<b>Q&A agent</b><br/>retrieve and synthesise` matches a row labelled `Q&A agent`. A connector between two identified shapes takes the id of the one row joining them, in either direction, and is then rewired to the document's direction. Two candidates for one row are reported as `ambig` and neither is tagged. Geometry, captions and formatting are kept: a label whose name line already matches its row is never rewritten.

Run it with `--dry-run` first and read the adopt lines. Rows with no matching shape are added below the drawing as usual.

## The conventions that make it work

Identifiers go on the `<object>` wrapper, never on the mxCell id. draw.io regenerates mxCell ids on copy, paste, duplicate and id collision, while custom attributes are part of the cell's user object and are cloned with it. That is what lets a shape be matched to a table row across edits. It also means a copy-pasted shape keeps its identifier, so duplicate detection is mandatory rather than optional.

Scenarios are layers, not pages. Duplicating a page regenerates every mxCell id, so overlay arrows stop referencing the real shapes, and it clones every identifier so a reader sees each node once per page.

Overlay arrows point at the real structure shapes. That makes the overlay part of the graph rather than a picture laid on top of it, and it is what lets validation catch an arrow that was re-pointed without its metadata following.

## Procedure

### Generating a diagram from a document

1. Check the document has the tables the config declares. Run `extract` first and read the summary; if the node or edge count is zero, the section headings or column names do not match the config.
2. `emit --to drawio`. It refuses to overwrite an existing diagram, because doing so would discard the author's layout. Use `--force` only when you mean to start again.
3. Open the result and arrange it. Generated layout is a mechanical grid: every box and arrow is present and correctly identified, but the routing will overlap and the labels will collide. Arranging it is the author's job.
4. Re-run `validate <doc> --against <drawio>` after any edit to either side.

### Checking a diagram against its document

```bash
python bin/model.py validate doc.md --against components.drawio
```

Report what it finds. The findings that matter most are the ones nobody can see by looking: an edge wired differently in the two representations, an overlay step whose asserted endpoints disagree with its real ones, and an identifier that appears twice.

### Rendering

```bash
python bin/model.py layers components.drawio
python bin/model.py render components.drawio --out scenario-1.svg --layer Structure --layer "S1 Happy path"
```

Layers are addressed by name, not index, because indexes shift when someone reorders them. Prefer SVG. The draw.io CLI changes flags between releases, so the skill probes the installed build and passes only what it accepts; if rendering fails, check the draw.io version before suspecting anything else.

An SVG is pinned to the light colour scheme on a white background by default. draw.io on its own writes colours that follow the viewer's system setting on a transparent background, so a diagram embedded in a document or a slide turns dark on a dark-mode machine while the page around it stays light. `--theme dark` pins the dark scheme, `--theme auto` keeps draw.io's behaviour, and `--transparent` keeps the background transparent.

Every render also writes `<image>.render.json` beside the image: the source diagram relative to the image, a SHA-256 of it with line endings normalised, and the layers. A consumer, such as markdown-deck, compares the fingerprint with the diagram as it is now and reports the image as stale when they differ, naming the command that re-renders it. Commit the record with the image.

### Animating the scenarios

```bash
python bin/model.py animate index.md
```

Writes `scenarios.html` beside an `index.md`, or `<stem>-scenarios.html` beside any other document: one self-contained page that opens from disk in any browser, with no server. It steps through each scenario on the structure view: the step's number on the acting shape, an arrow drawn to the target, everything else dimmed, a zoom onto the two shapes, and the narrative with the interface's purpose and spare columns. Arrow keys step, space plays.

The document supplies names, narratives and interface details; the diagram supplies geometry and each step's endpoints. The page draws its own arrows between the shapes' current positions, so after moving shapes, re-run it; there is nothing else to update. Positions inside groups and containers are resolved.

It validates first and stops rather than guesses. A step with no narrative, an endpoint with no shape on the structure layer, a scenario in the document but not on the diagram or the reverse, or a rendered view whose proportions differ from the shapes' extent is an error that names every case. The last usually means an edge label or waypoint lies outside the shapes; a background rectangle enclosing the structure layer, used as a frame, fixes it.

## Configuration

`.agents/skill-bindings.toml`, found by searching upward from the input file, or passed with `--config`. `model.toml` is still recognised as an alias. One file binds the whole skill suite to the host repository's layout.

Run `doctor` before anything else. It resolves every binding to an absolute path, verifies the ones that must exist, and exits non-zero if any do not. `--skill NAME` checks a sibling skill's `inputs.toml` contract instead of this skill's own, so a prose skill can declare what it needs without shipping a runtime.

A path binding may carry a `{placeholder}`, such as `planning/{quarter}/basis.csv`, when one binding covers many runs. Only the skill that owns the placeholder can fill it, so `doctor` checks the directory in front of the first placeholder and leaves the rest to that skill.

Relative paths anchor to the directory holding the binding file, never to the working directory, so a binding means the same thing wherever it is run from. `bindingsVersion` is refused if its major is one this skill does not understand: a silently misread binding is worse than a stopped run.

It declares the draw.io attribute names, the Markdown table contract as section and column names, optional catalogue files to check identifiers against, each with an optional `level` of `conceptual`, `logical` or `physical` for the derived abstraction, and a severity for each rule. `examples/model.toml` is a complete worked example. With no config at all, conventional headings such as `## Components` and `## Interfaces` work out of the box.

A declared catalogue that cannot be read is an error, not an absence. Skipping it silently would turn `not_in_catalogue` into a no-op exactly when the binding is wrong, which is the moment it most needs to speak up.

The rules added for local identifiers are `id_unmatched`, `id_attr_mismatch`, `mapping_missing` (warn by default), `mapping_unknown_local`, `mapping_invalid`, `mapping_not_in_catalogue` and `mapping_duplicates_node` (warn).

Every rule has a severity of `error`, `warn` or `off`. Set an unhelpful rule to `warn` rather than abandoning the tool: a rule that is right for a new diagram is often wrong as a hard failure across an existing estate.

## Reporting back

Give the counts from the summary line, name the findings by rule, and say which file each side of a disagreement favours. Never report a render as successful without checking the output file exists and is non-empty; some draw.io releases print an error on success and a success on failure.

## Library use

`from model import load, drawio, markdown, serial, validate` works if `src` is on the path. `load(path, cfg)` returns a `Model` of `nodes`, `edges`, `groups` and `scenarios`.
