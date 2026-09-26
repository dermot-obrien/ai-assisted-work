<!-- SPDX-License-Identifier: Apache-2.0 -->

# model

An agent skill that treats a diagram and a document as two views of one model of boxes and lines.

Extract a model from Markdown tables, a draw.io file, JSON or YAML. Emit it to any of those. Validate one representation against another. Render draw.io layers to SVG, PNG or PDF.

Nothing in the skill knows what the boxes mean. An architecture pattern, a network topology, a process flow and a data lineage are the same shape, so domain vocabulary lives in a `model.toml` in your project.

Standalone: pure Python standard library, no dependency on any host repository, and no installation required.

## Install

### Any agent

| Directory | Tools that read it |
|---|---|
| `.agents/skills/model/` | Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, Amp, Zed, Windsurf, Cline |
| `.claude/skills/model/` | Claude Code only |

```bash
gh skill install OWNER/model model --scope user --pin v0.1.0
npx skills add OWNER/model/skills/model
gemini skills install https://github.com/OWNER/model.git --path skills/model --scope user --consent
```

Claude Code as a plugin, which is the only route that resolves dependencies between skills:

```
/plugin marketplace add OWNER/model
/plugin install model@OWNER-skills
```

Pinned and auditable, for a regulated or air-gapped consumer:

```bash
git subtree add --prefix .agents/skills/model https://github.com/OWNER/model v0.1.0 --squash
```

## Usage

```bash
python bin/model.py doctor
python bin/model.py extract  doc.md --format json
python bin/model.py emit     doc.md --to drawio --out components.drawio
python bin/model.py validate doc.md --against components.drawio
python bin/model.py sync     doc.md components.drawio
python bin/model.py layers   components.drawio
python bin/model.py render   components.drawio --out s1.svg --layer Structure --layer "S1 Happy path"
```

Try the worked example:

```bash
python bin/model.py validate examples/example.md --config examples/model.toml --against /dev/null
python bin/model.py emit examples/example.md --config examples/model.toml --to drawio --out .tmp/components.drawio
```

## The model

```
Model
├── nodes      id, label, group, kind, attrs
├── edges      id, source, target, label, kind, attrs
├── groups     id, label
└── scenarios  key, name, steps[ step, actor, target, action, edge ]
```

A scenario is a numbered walkthrough overlaid on the structure. That is a UML communication diagram, which C4 calls a dynamic diagram. It cannot express branching, loops or concurrency, so a flow with real alternatives belongs in a sequence diagram instead.

## Configuration

`.agents/skill-bindings.toml`, found by searching upward from the input, or passed with `--config`. `model.toml` is still recognised as an alias:

```toml
bindingsVersion = "1.0"          # major bump = breaking; the reader refuses an unknown major

[model]
node_id_attrs = ["node_id"]      # draw.io attributes carrying the node identifier
edge_id_attr  = "edge_id"
group_attr    = "group"

[[markdown.tables]]
section    = "Components"
entity     = "node"
id_pattern = "(SVC|EXT)-[0-9]{2}"
columns    = { id = "Component", label = "Component", group = "Zone" }

[[markdown.tables]]
section = "Interfaces"
entity  = "edge"
columns = { id = "Interface", source = "Provider", target = "Consumer", label = "Purpose" }

[markdown.scenarios]
section = "Scenarios"
columns = { step = "Step", actor = "Actor", action = "Action", edge = "Interface", target = "Target" }

[[catalogues]]
path   = "catalogue/components.csv"
column = "id"

[rules]
node_id_mismatch = "warn"
edge_missing_id  = "off"
```

With no config, conventional headings such as `## Components` and `## Interfaces` work out of the box.

Relative paths anchor to the directory holding the binding file, never the working directory. An absolute path in a committed binding is reported as a warning, because it will not survive a clone on another machine.

`doctor` resolves and checks the lot:

```bash
python bin/model.py doctor                                 # this skill's bindings
python bin/model.py doctor --skill pattern  # a sibling's contract
```

A sibling skill declares what it needs in an `inputs.toml` beside its SKILL.md, and the repository answers in `[suite.<name>]`. That is how a skill with no runtime of its own gets its bindings resolved and checked: it borrows this one. It matters because agents skip preconditions often enough to measure, and a broken path reference inside a SKILL.md raises nothing at all.

## Rules

Every rule has a severity of `error`, `warn` or `off`. A rule that is right for a new diagram is often wrong as a hard failure across an existing estate, and a tool that cannot be adopted incrementally does not get adopted.

| Rule | Catches |
|---|---|
| `node_missing_id` | A shape with no identifier |
| `node_duplicate_id` | The same identifier twice, that is, a copy-paste |
| `node_id_mismatch` | The mxCell id differs from the identifier attribute |
| `edge_missing_id`, `edge_unlabelled` | A connector with no identifier, or that does not say what flows |
| `edge_dangling`, `edge_unknown_endpoint` | A free end, or an endpoint that is not a known node |
| `step_missing_fields`, `step_not_contiguous` | An overlay element missing its scenario or step, or a gap in the numbering |
| `step_endpoint_mismatch` | An arrow re-pointed without its metadata following |
| `catalogue_unreadable` | A declared catalogue that is missing, has the wrong column, or is empty |
| `not_in_catalogue` | An identifier the project does not recognise |
| `doc_not_in_diagram`, `diagram_not_in_doc` | A row nobody drew, or a shape nobody wrote down |

The last five are the ones that earn their keep. Anyone can see an unlabelled box. Nobody can see, by looking, that an arrow now points somewhere else.

`catalogue_unreadable` exists because the alternative is worse than no check at all. A skill installed into a repository with a different layout points its catalogue paths at nothing; if that were treated as an absence rather than a fault, `not_in_catalogue` would silently pass everything at exactly the moment it was most needed. Declaring no catalogues is fine and silent. Declaring one that cannot be read is an error.

## Known limitations

Generated layout is a mechanical grid. Every box and arrow is present and correctly identified, but routing overlaps and edge labels collide where several interfaces converge on one component. Arranging the diagram is the author's job; `sync` preserves that work, and `emit --to drawio` refuses to overwrite an existing diagram so you cannot lose it by accident.

`sync` needs an uncompressed `.drawio` and tells you how to normalise one if it is not.

Round-tripping is not lossless in both directions. A diagram legitimately holds bands, annotations and a legend that the model has no place for. Those are read as "not a node" and left alone.

## Layout

```
model/
├── SKILL.md            the skill definition, Agent Skills format
├── LICENSE             duplicated in the payload so a copied dir is self-sufficient
├── pyproject.toml      optional pip install
├── bin/model.py        entry point, runs from a copied directory
├── src/model/
│   ├── schema.py       the canonical model, no domain vocabulary
│   ├── config.py       model.toml
│   ├── markdown.py     GFM tables, both directions
│   ├── drawio.py       mxGraph XML, both directions
│   ├── serial.py       JSON, YAML, CSV
│   ├── bindings.py     resolve and check what the repository declared
│   ├── validate.py     rules and severities
│   ├── sync.py         reconcile a diagram with its document, keeping geometry
│   ├── render.py       draw.io CLI, with capability probing
│   ├── animate.py      standalone HTML step-through of the scenarios
│   └── cli.py
├── scripts/pack-repo.py
└── examples/
```

## Licence

Apache-2.0. See [LICENSE](./LICENSE).
