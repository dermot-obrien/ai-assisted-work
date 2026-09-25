<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Semantic versions, with the contract defined as: MAJOR for a changed skill `name`, a removed command, a changed CLI interface or a changed model schema; MINOR for new commands, adapters or rules; PATCH for wording and fixes.

## [0.2.0] - 2026-09-25

Local ids may be plain numbers: `local_pattern = '[0-9]{1,3}'` reads `01 Gateway` as local id `01`. A local id must lead its cell, so a number inside a name is never one, and its draw.io cell id is `local-01`, since draw.io's own cells `0` and `1` would collide with local nodes `0` and `1`. `rename` never touches front matter, checks clashes against the model's identifiers rather than raw text, and replaces a plain-number id only where it leads a table cell. `local_prefix` still works.


Several models in one folder, and local identifiers beside catalogued ones.

### Added

- A render record. `render` writes `<image>.render.json` beside each image: the source diagram, a SHA-256 of it with CRLF normalised to LF so a Windows checkout and a Linux runner agree, and the layers. `render.check_record` says whether an image is still current. The record is a file convention, so a consumer needs no dependency on this skill.
- `model:` front matter, naming a document's diagram. A folder can now hold several models, each a document plus the diagram it declares. `validate` uses the declared diagram when `--against` is absent.
- `scan <folder>`, which finds every declared model, validates each against its diagram, qualifies local ids by document, and lists the views to render as `<stem>.svg` and `<stem>-sN.svg`.
- `local_prefix` and `local_attr` bindings. Identifiers carrying the reserved prefix are local to their document: exempt from the catalogue check, written to their own draw.io attribute, and mapped onto the catalogue in a `Catalogue Mapping` table.
- Mapping rules: `mapping_missing`, `mapping_unknown_local`, `mapping_invalid`, `mapping_not_in_catalogue`, `mapping_duplicates_node`.
- `id_attr_mismatch`, so a local id can never pass for a catalogue one on the diagram, nor the reverse.
- `rename <doc> OLD NEW`, which promotes or corrects an identifier across the document and the diagram, following every cell reference.
- `sync --adopt`, which tags unidentified shapes and connectors whose label names a row, keeping geometry and formatting. It is how a hand-drawn diagram joins a model.
- A standard-library test suite under `tests/`.

### Changed

- A table cell that no identifier rule matches is reported as `id_unmatched`. It was silently dropped, so a table written with the wrong prefix produced an empty model and no finding.
- The draw.io attribute for a catalogued id is chosen by its prefix, so an SBB id is written to `sbb_id` rather than always to the first declared attribute.
- `sync` resolves identifiers to cell ids before wiring edges and overlays, so a copy-pasted or adopted shape whose cell id differs from its identifier is still connected correctly.
- `sync` no longer rewrites a label whose first line or leading bold run already names the row.
- `validate --against` also runs the duplicate, attribute and endpoint rules over the diagram, not only over the document.

### Fixed

- `render` crashed printing its result when the output was on a different Windows drive from the working directory. The file had been written; only the report failed.

## [0.1.0] - 2026-09-25

First release. Commands: `extract`, `emit`, `validate`, `sync`, `render`, `layers`, `doctor`.

### Added

- A generic canonical model of nodes, edges, groups and scenarios, with no domain vocabulary. Anything expressible as boxes and lines fits it.
- Markdown adapter, reading and writing GFM tables against a contract declared in config rather than hardcoded. HTML comments are stripped first, so template guidance never becomes model content.
- draw.io adapter, reading and writing. Handles compressed and uncompressed pages and both `object` and `UserObject` wrappers. Identifiers live on the object wrapper because mxCell ids do not survive copy and paste.
- Scenario overlays generated from a steps table, as draw.io layers. Contiguity and endpoint agreement hold by construction.
- JSON, YAML and CSV serialisation. YAML is written with a small stdlib writer; only reading YAML needs PyYAML.
- Thirteen validation rules, each with a configurable severity, covering the model alone, the catalogue, and the agreement between two representations.
- `catalogue_unreadable`, which fails loudly when a declared catalogue is missing, has the wrong column or is empty. Without it the catalogue check failed open: a wrong path was read as an absence, so `not_in_catalogue` set to `error` quietly passed everything. That is the failure mode of installing the skill into a repository with a different layout, which is the case it most needs to catch.
- `sync`, which reconciles a diagram with its document while preserving geometry. The document owns what exists and what connects; the diagram owns where things sit. Shapes without a recognised identifier, such as bands, legends and annotations, are never touched. Scenario overlays are derived, so they are rebuilt rather than reconciled.
- `render`, which probes the installed draw.io build via its own `--help` and passes only the flags it accepts. Version 29.7 dropped `--disable-update` and `--timeout`, which older documentation still lists, and an unknown flag breaks argument parsing with an error that blames the input file.

- `doctor`, which resolves every binding to an absolute path and says what does not resolve. `--skill NAME` checks a sibling's `inputs.toml` contract instead, so a skill with no runtime of its own borrows this resolver rather than asking the agent to read a config file. Agents skip preconditions often enough to measure, and a broken path reference inside a SKILL.md raises nothing at all.
- `.agents/skill-bindings.toml` as the preferred config name, with `model.toml` kept as an alias. One file binds the whole suite; `[suite.<name>]` sections belong to the other skills.
- `bindingsVersion`, refused when its major is unknown. There is no version-skew defence anywhere in the skills ecosystem, so this is ours.
- Path bindings may be pinned with a sibling `<name>Sha256`, so a shared artefact vendored once into the repository is held to the version that was reviewed. An absolute path in a committed binding is warned about, because it will not survive a clone on another machine.

### Known limitations

- Generated layout is a mechanical grid. Every box and arrow is present and correctly identified, but routing overlaps and edge labels collide where several interfaces converge on one component. Arranging the diagram is the author's job; `sync` preserves that work.
- `emit --to drawio` refuses to overwrite an existing diagram, because that would discard the layout. Use `sync`.
- `sync` needs an uncompressed .drawio and says so with the command to normalise one.
