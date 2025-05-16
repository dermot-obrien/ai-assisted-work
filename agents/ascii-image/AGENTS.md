# ASCII Image Agents

Agents for converting ASCII diagrams to proper images.

## Overview

These agents convert ASCII art diagrams in markdown documents to proper image formats (Draw.io, PNG, SVG).

## Why Convert ASCII?

| ASCII Diagrams | Proper Images |
|----------------|---------------|
| Quick to create | Professional appearance |
| Version control friendly | Publication ready |
| Tool-agnostic | Consistent styling |
| But look unprofessional | But harder to maintain |

**Solution**: Author in ASCII, publish as images.

## Available Agents

| Agent | File | Purpose |
|-------|------|---------|
| Detect ASCII | `detect-ascii.md` | Find ASCII diagrams in markdown |
| Convert ASCII | `convert-ascii.md` | Generate Draw.io/Mermaid from ASCII |
| Replace ASCII | `replace-ascii.md` | Update documents with image references |

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ASCII to Image Workflow                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

    Document.md              Detect            Convert           Replace
         │                     │                  │                 │
         │  ┌────────────┐     │                  │                 │
         │  │ ```        │     │                  │                 │
         │  │ ┌───┐ ┌───┐│     │                  │                 │
         │  │ │ A │─│ B ││     │                  │                 │
         │  │ └───┘ └───┘│     │                  │                 │
         │  │ ```        │     │                  │                 │
         │  └────────────┘     │                  │                 │
         │        │            │                  │                 │
         └────────┼────────────┘                  │                 │
                  │                               │                 │
                  ▼                               │                 │
           ASCII detected                        │                 │
           (lines 10-15)                         │                 │
                  │                               │                 │
                  └───────────────────────────────┘                 │
                                 │                                  │
                                 ▼                                  │
                          Generate .drawio                          │
                          Export .png                               │
                                 │                                  │
                                 └──────────────────────────────────┘
                                                │
                                                ▼
                                         Update document
                                         with image ref
```

## Supported Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| Box diagrams | Containers with borders | `┌──┐ └──┘` |
| Flow diagrams | Arrows showing flow | `──►` `───` |
| Hierarchy | Tree structures | Parent/child |
| State machines | States and transitions | Lifecycle |
| Tables | Grid layouts | Matrices |

## Output Formats

| Format | Use Case |
|--------|----------|
| Draw.io (.drawio) | Editable diagrams |
| PNG | Documentation, web |
| SVG | Scalable, web |
| Mermaid | GitHub rendering |

## Templates

See `_templates/` for:
- Draw.io base templates
- Style definitions
- Color palettes

## Integration

Works with any markdown-based documentation:
- Architecture documents
- Technical specs
- README files
- Wiki pages
