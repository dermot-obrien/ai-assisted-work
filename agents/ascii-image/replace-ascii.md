# Replace ASCII Agent

Replace ASCII diagrams in documents with image references.

## Purpose

Update markdown documents to reference generated images instead of inline ASCII diagrams.

## Prerequisites

- Original markdown document
- Generated image files (.drawio, .png)
- Detection results (which ASCII to replace)

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Document path | Yes | Markdown file to update |
| Image files | Yes | Generated images to reference |
| Detection results | Yes | Where ASCII diagrams are located |
| Keep ASCII | No | Whether to keep ASCII as comment (default: false) |

## Steps

1. **Read the document**
   - Load markdown content
   - Identify ASCII locations from detection

2. **Match ASCII to images**
   - Correlate each detected ASCII with its generated image
   - Verify images exist

3. **Generate image references**
   - Create markdown image syntax
   - Include alt text
   - Set appropriate path

4. **Replace in document**
   - For each ASCII diagram:
     - Optionally comment out original ASCII
     - Insert image reference
     - Maintain document flow

5. **Save updated document**
   - Write to same path (or new path)
   - Backup original if requested

## Outputs

| Output | Description |
|--------|-------------|
| Updated document | Markdown with image references |
| Replacement report | What was replaced |

## Replacement Options

### Option 1: Simple Replace

Before:
```markdown
## Architecture

┌─────────┐
│ Client  │
└─────────┘
```

After:
```markdown
## Architecture

![Architecture Diagram](images/architecture.png)
```

### Option 2: Keep ASCII as Comment

After:
```markdown
## Architecture

![Architecture Diagram](images/architecture.png)

<!--
Original ASCII (preserved for editing):
┌─────────┐
│ Client  │
└─────────┘
-->
```

### Option 3: Collapsible ASCII

After:
```markdown
## Architecture

![Architecture Diagram](images/architecture.png)

<details>
<summary>View ASCII source</summary>

┌─────────┐
│ Client  │
└─────────┘

</details>
```

## Image Reference Format

```markdown
![{alt_text}]({path})
```

Where:
- `alt_text`: Description for accessibility
- `path`: Relative path to image

## Example Session

### Input

Document: `docs/architecture.md`
Detection: ASCII at lines 45-55
Image: `docs/images/component-diagram.png`

### Process

```
1. Read docs/architecture.md
2. Find ASCII at lines 45-55
3. Replace with:
   ![Component Diagram](images/component-diagram.png)
4. Save updated document
```

### Output

```markdown
## System Components

![Component Diagram](images/component-diagram.png)

The system consists of...
```

## Batch Replacement

For multiple diagrams in one document:

```yaml
replacements:
  - ascii_location:
      start: 45
      end: 55
    image: "images/diagram-1.png"
    alt_text: "Component Architecture"
    
  - ascii_location:
      start: 120
      end: 135
    image: "images/diagram-2.png"
    alt_text: "Data Flow"
```

## Path Handling

| Document Location | Image Location | Reference |
|-------------------|----------------|-----------|
| `docs/guide.md` | `docs/images/x.png` | `images/x.png` |
| `docs/sub/page.md` | `docs/images/x.png` | `../images/x.png` |
| `README.md` | `assets/x.png` | `assets/x.png` |

## Error Handling

| Error | Resolution |
|-------|------------|
| Image not found | Report missing, skip replacement |
| ASCII not found at location | Warn, skip |
| Document read-only | Report error |

## Tips

- Always backup before replacing
- Review changes before committing
- Use relative paths for portability
- Include meaningful alt text
- Consider keeping ASCII as comments for future edits
