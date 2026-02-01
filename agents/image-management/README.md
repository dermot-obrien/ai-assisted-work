# Image Management

The **image management** agents handle visualization tasks including diagram creation, ASCII diagram replacement, and visual asset management.

> **AI Agents:** Read [AGENTS.md](AGENTS.md) before working with image management. It contains critical rules about diagram creation, file naming, and verification workflows.

---

## Motivation

### Why ASCII Art First?

AI agents excel at generating documentation with embedded ASCII diagrams. ASCII art is:

- **Fast to create** - AI can generate diagrams inline with prose
- **Easy to iterate** - Quick changes during content development
- **Version control friendly** - Text diffs show exactly what changed
- **No tooling required** - Works in any text editor

This creates a natural tension: **AI freedom vs. formal documentation**.

During active content development, we want AI to freely create and modify ASCII diagrams without the overhead of maintaining Draw.io files. The ASCII format enables rapid iteration and keeps the focus on content, not presentation.

### When to Convert

ASCII diagrams should be converted to formal images **only when the document content is stable**. Converting too early creates maintenance burden - every content change requires updating both ASCII and images.

The conversion trigger is **document curation**:

1. Content has been reviewed and is considered stable
2. Document is ready for formal publication or stakeholder review
3. ASCII diagrams need professional presentation

This aligns with **AI content provenance** principles - we track when content transitions from AI-generated draft to curated artifact.

### The Conversion Workflow

The workflow is designed for verification at each step:

```
ASCII Art (AI-generated, curated)
    │
    ▼
PNG Image (generated from ASCII description)
    │
    ▼ ← Verify: Does PNG match ASCII intent?
    │
Draw.io (generated from PNG)
    │
    ▼ ← Manual refinement in Draw.io
    │
Final PNG (exported from Draw.io)
    │
    ▼ ← Replace ASCII in document
```

**Key principle**: Each artifact is verified against the previous one before proceeding.

---

## Quick Start

**Replacing ASCII diagrams with Draw.io and PNG:**
```
/replace-ascii-diagrams
```

See [Commands](#commands) for full list.

## Invoking Commands

Commands can be invoked using slash notation:

| Command | Purpose |
|---------|---------|
| `/replace-ascii-diagrams` | Scan documents for ASCII diagrams and replace with Draw.io/PNG |

---

## Core Concepts

### ASCII Diagram Types

The agent recognizes these types of ASCII diagrams:

| Type | Pattern | Example |
|------|---------|---------|
| **Box diagrams** | `+--+`, `[Box]`, `┌──┐` | Architecture diagrams, component boxes |
| **Flow diagrams** | `-->`, `->`, `=>`, `│`, `─` | Data flows, process flows |
| **Tree structures** | `├──`, `└──`, `├─`, `└─` | Hierarchy, file trees |
| **Tables** | `\|---\|`, `+-+-+` | Sometimes confused with markdown tables |
| **Sequence diagrams** | Vertical `\|` with arrows | Interaction flows |

### Output File Types

For each ASCII diagram, the agent creates two files:

| File Type | Purpose | Format |
|-----------|---------|--------|
| **Draw.io** | Editable source (for ongoing maintenance) | `.drawio` (XML) |
| **PNG** | Display image (embedded in documents) | `.png` (exported from Draw.io) |

### Sequential Verification Workflow

The workflow is **sequential, not parallel**. Each step builds on the previous:

1. **PNG from ASCII** - Generate initial PNG from ASCII description
2. **Verify PNG** - User confirms PNG matches ASCII intent
3. **Draw.io from PNG** - Generate Draw.io based on the verified PNG
4. **Manual refinement** - User refines Draw.io as needed
5. **Final PNG from Draw.io** - Export production PNG from Draw.io
6. **Replace ASCII** - Swap ASCII for final PNG in document

This ensures the final PNG is:
- Faithful to the original ASCII intent (verified at step 2)
- Professionally refined in Draw.io (step 4)
- Maintainable long-term (Draw.io source exists)

### Workflow Phases

| Phase | Description |
|-------|-------------|
| **1. Pre-check** | Confirm document is curated and stable |
| **2. Discovery** | Scan documents, identify ASCII diagrams |
| **3. PNG Generation** | Create initial PNG from ASCII |
| **4. PNG Verification** | User confirms PNG matches ASCII |
| **5. Draw.io Generation** | Create Draw.io from verified PNG |
| **6. Manual Refinement** | User refines Draw.io (human task) |
| **7. Final Export** | Export final PNG from Draw.io (human task) |
| **8. Replacement** | Replace ASCII with final PNG image links |

---

## File Organization

### Diagram Naming Convention

Diagrams are named based on their source document and context:

```
{source-doc-name}-{diagram-context}.drawio
{source-doc-name}-{diagram-context}.png
```

Examples:
- `architecture-overview-component-layout.drawio`
- `data-flow-order-processing.png`
- `deployment-network-topology.drawio`

### Storage Location

Diagrams are stored alongside their source documents or in a `diagrams/` subfolder:

**Option A: Alongside source (default for single diagrams)**
```
document-folder/
├── architecture.md
├── architecture-component-layout.drawio
└── architecture-component-layout.png
```

**Option B: Diagrams subfolder (for multiple diagrams)**
```
document-folder/
├── architecture.md
└── diagrams/
    ├── component-layout.drawio
    ├── component-layout.png
    ├── data-flow.drawio
    └── data-flow.png
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `/replace-ascii-diagrams` | Full workflow: discover, generate, verify, replace |

### Replace ASCII Diagrams

The `/replace-ascii-diagrams` command walks through the complete workflow:

1. **Asks for target folder** - User specifies which folder structure to scan
2. **Scans documents** - Finds all markdown files in the folder
3. **Identifies ASCII diagrams** - Uses pattern matching to find ASCII art
4. **Presents discovery report** - Shows what was found for user review
5. **Generates diagrams** - Creates Draw.io and PNG for each ASCII diagram
6. **Verification checkpoint** - User reviews and approves each pair
7. **Replaces ASCII** - Swaps ASCII for PNG image links

**Usage:**
```
/replace-ascii-diagrams
```

---

## Draw.io Diagram Standards

All diagrams must follow BNZ Visual Design Standards:

### Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Primary | BNZ Navy Blue | `#003087` |
| Accent | BNZ Orange | `#FF6B35` |
| Highlight | BNZ Light Blue | `#50E6FF` |
| Success | BNZ Teal | `#00A651` |

### Canvas Size

| Type | Size |
|------|------|
| Standard (16:9) | 2400x1800px |
| Presentation | 1920x1080px |
| Compact | 1200x900px |

### Requirements

- **Legend**: Every diagram must include a legend explaining shapes, colors, and arrows
- **Fonts**: Helvetica for diagrams
- **Margins**: 40-50px minimum
- **Accessibility**: WCAG 2.1 AA compliant (4.5:1 contrast ratio)

---

## Reference

- [AGENTS.md](AGENTS.md) - **Critical rules for AI agents** (read first)
- [replace-ascii-diagrams.md](replace-ascii-diagrams.md) - Full workflow documentation
- [05-governance/standards/visual-design/visual-design-standard.md](../../05-governance/standards/visual-design/visual-design-standard.md) - BNZ visual standards
