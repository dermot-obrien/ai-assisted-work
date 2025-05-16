# Detect ASCII Agent

Find ASCII diagrams in markdown documents.

## Purpose

Scan markdown documents to identify ASCII art diagrams that could be converted to proper images.

## Prerequisites

- Markdown document to scan

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| File path | Yes | Path to markdown file |
| Include patterns | No | Specific patterns to look for |

## Steps

1. **Read the document**
   - Load the markdown file
   - Parse into lines

2. **Identify code blocks**
   - Find fenced code blocks (```)
   - Find indented code blocks
   - Note line numbers

3. **Analyze for ASCII patterns**
   - Box characters: `┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼`
   - Simple boxes: `+ - | [ ]`
   - Arrows: `► ▼ ◄ ▲ → ← ↑ ↓ ──► <──`
   - Lines: `───` `│` `===`

4. **Classify diagram type**
   - Box diagram: Contains box characters, represents components
   - Flow diagram: Contains arrows, shows data/process flow
   - Hierarchy: Tree structure
   - Table/Matrix: Grid layout
   - State diagram: States with transitions

5. **Generate detection report**
   - List each detected diagram
   - Start/end line numbers
   - Diagram type
   - Confidence level

## Outputs

| Output | Description |
|--------|-------------|
| Detection report | List of ASCII diagrams found |

## Detection Report Format

```yaml
file: "path/to/document.md"
diagrams_found: 3
diagrams:
  - id: 1
    start_line: 45
    end_line: 55
    type: "box_diagram"
    confidence: "high"
    description: "Component architecture diagram"
    characters_detected:
      - "┌┐└┘"
      - "│─"
      - "►"
    
  - id: 2
    start_line: 120
    end_line: 135
    type: "flow_diagram"
    confidence: "high"
    description: "Data flow between components"
    characters_detected:
      - "──►"
      - "│"
      
  - id: 3
    start_line: 200
    end_line: 210
    type: "hierarchy"
    confidence: "medium"
    description: "Tree structure"
    characters_detected:
      - "├──"
      - "└──"
```

## Pattern Recognition

### High Confidence Indicators

| Pattern | Indicates |
|---------|-----------|
| `┌───┐` with `└───┘` | Box diagram |
| `──►` or `───>` | Flow diagram |
| `├──` and `└──` | Hierarchy/tree |
| Multiple aligned `│` | Structured diagram |

### Low Confidence (May Not Be Diagram)

| Pattern | Could Be |
|---------|----------|
| Single `|` | Table column |
| `---` | Markdown separator |
| Indented text | Code, not diagram |

## Example

### Input Document

```markdown
# Architecture

The system has these components:

┌─────────────┐     ┌─────────────┐
│   Client    │────►│   Server    │
└─────────────┘     └─────────────┘
        │                  │
        ▼                  ▼
┌─────────────┐     ┌─────────────┐
│   Cache     │     │  Database   │
└─────────────┘     └─────────────┘
```

### Detection Output

```yaml
diagrams_found: 1
diagrams:
  - id: 1
    start_line: 5
    end_line: 13
    type: "box_diagram"
    confidence: "high"
    description: "4-component architecture with connections"
    suggested_conversion: "draw.io component diagram"
```

## Error Handling

| Error | Resolution |
|-------|------------|
| File not found | Report error |
| No diagrams found | Report "no ASCII diagrams detected" |
| Ambiguous pattern | Report with lower confidence |

## Tips

- Run on documents before publication
- Focus on high-confidence detections first
- Some ASCII may be intentional (preserve if small/simple)
- Large diagrams benefit most from conversion
