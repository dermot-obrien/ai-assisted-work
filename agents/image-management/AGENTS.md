# Image Management Agent Rules

Component-specific rules for AI agents working with image management tasks.

**Read this file before using:** `replace-ascii-diagrams.md`

**Required for batch operations:** Read `../.agents/work-management/AGENTS.md` and `../.agents/work-management/progress-work.md` when processing multiple diagrams.

## Core Principles

1. **AI freedom first** - Let AI freely generate ASCII art during content development.
2. **Convert when stable** - Only convert to images after document is curated.
3. **Accuracy over speed** - Faithfully represent the original ASCII, don't reinterpret.
4. **Sequential verification** - Each artifact verifies against the previous one.
5. **Resumable work** - Track progress so work can be resumed after interruption.

## The Conversion Flow

```
ASCII (AI-generated) → PNG (verify) → Draw.io (from PNG) → Manual refinement → Final PNG (from Draw.io)
```

Each step builds on and verifies the previous step.

---

## Work Management Integration

When processing multiple ASCII diagrams (batch operations), **always** integrate with the work management system to enable:

- **Parallel work**: Multiple agents can work on different files/diagrams
- **Resume from interruption**: If a session fails, another agent can continue
- **Progress visibility**: Users can see what's done and what's pending
- **Human task coordination**: Clear handoffs for verification and refinement steps

### When to Create a Work Item Activity

| Scenario | Action |
|----------|--------|
| Single diagram in one file | No work item needed - complete in session |
| 2-5 diagrams in one file | Optional - create activity if complex |
| 6+ diagrams OR multiple files | **Required** - create work item activity |
| Part of existing work item | **Required** - add activity to work item |

### Activity Structure for Diagram Replacement

When diagram replacement is part of a work item (e.g., WI-006), create an activity with this structure:

```yaml
- id: WI-XXX-A{N}
  title: "ASCII Diagram Replacement"
  status: pending
  actor: any
  depends_on: []  # Usually independent
  tasks:
    - id: WI-XXX-A{N}-T1
      title: "Scan and document ASCII diagrams"
      status: pending
      actor: agent
    - id: WI-XXX-A{N}-T2
      title: "Generate PNG images (batch)"
      status: pending
      actor: agent
    - id: WI-XXX-A{N}-T3
      title: "User verification of PNG images"
      status: pending
      actor: human
    - id: WI-XXX-A{N}-T4
      title: "Generate Draw.io source files"
      status: pending
      actor: agent
    - id: WI-XXX-A{N}-T5
      title: "User refinement of Draw.io files"
      status: pending
      actor: human
    - id: WI-XXX-A{N}-T6
      title: "Final PNG export"
      status: pending
      actor: human
    - id: WI-XXX-A{N}-T7
      title: "Replace ASCII with PNG references"
      status: pending
      actor: agent
```

### Per-Diagram Progress Tracking

For batch operations, track **individual diagram status** in the activity notes or a tracking file (`diagram-progress.yaml`):

```yaml
# diagram-progress.yaml (in work item folder)
diagrams:
  - id: D001
    source_file: "deliverables/D03-integration-patterns.md"
    source_lines: "45-67"
    title: "Data Integration Flow"
    type: flow
    status: png_verified  # discovery | png_pending | png_generated | png_verified | drawio_generated | replaced
    png_file: "deliverables/images/D03-data-integration-flow.png"
    drawio_file: "deliverables/images/D03-data-integration-flow.drawio"
    notes: "Approved by user 2026-02-01"
  - id: D002
    source_file: "deliverables/D03-integration-patterns.md"
    source_lines: "89-112"
    title: "RAG Architecture"
    type: architecture
    status: png_pending
    png_file: null
    drawio_file: null
    notes: null
```

### Diagram Status States

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `discovery` | Identified in scan | Generate PNG |
| `png_pending` | Awaiting PNG generation | Agent generates PNG |
| `png_generated` | PNG created, awaiting verification | Human verifies |
| `png_verified` | User approved PNG | Generate Draw.io |
| `drawio_generated` | Draw.io created | Human refines |
| `drawio_refined` | Human refined Draw.io | Human exports final PNG |
| `ready_to_replace` | Final PNG ready | Agent replaces ASCII |
| `replaced` | ASCII replaced with PNG | Complete |
| `skipped` | User chose to skip | No further action |

### Lock File Usage

When claiming the diagram replacement activity:

```json
{
  "holder": "ai-agent-cursor",
  "holder_type": "agent",
  "acquired": "2026-02-01T09:00:00Z",
  "expires": "2026-02-01T10:00:00Z",
  "task_id": "WI-006-A18-T2",
  "task_acquired": "2026-02-01T09:15:00Z",
  "task_expires": "2026-02-01T09:45:00Z",
  "current_diagram": "D005"
}
```

The `current_diagram` field enables fine-grained recovery - another agent can resume from the exact diagram where work stopped.

### Resume Protocol

When resuming diagram replacement work:

1. **Read progress.yaml** - Check activity status and current task
2. **Read diagram-progress.yaml** - Find last completed diagram
3. **Verify outputs exist** - Check PNG/Draw.io files for completed diagrams
4. **Resume from next incomplete** - Continue from first diagram not at target status

Example:
```
Activity: WI-006-A18 (ASCII Diagram Replacement)
Task: WI-006-A18-T2 (Generate PNG images)
Progress: 12/25 diagrams at png_generated
Resume from: D013
```

### Parallel Work Opportunities

Different files can be processed in parallel by different agents:

| Agent 1 | Agent 2 |
|---------|---------|
| D03-integration-patterns.md (6 diagrams) | D15-initiative-risk-assessment.md (5 diagrams) |
| Claims activity with file scope | Claims activity with file scope |

To enable this, create separate sub-activities per file when diagram count is high:

```yaml
- id: WI-006-A18a
  title: "ASCII Diagram Replacement - D03"
  # ...
- id: WI-006-A18b
  title: "ASCII Diagram Replacement - D15"
  # ...
```

### Human Task Coordination

Human tasks (T3, T5, T6) block agent progress. Use the Manual Tasks Report:

```
=== MANUAL TASKS REPORT ===
Work Item: WI-006 - FutureSecure AI Architecture
Activity: WI-006-A18 - ASCII Diagram Replacement

AWAITING HUMAN ACTION:

1. [T3] Verify PNG images
   Location: deliverables/images/
   Diagrams pending verification: D001, D002, D003, D004, D005
   Instructions: Compare each PNG against original ASCII in markdown

2. [T5] Refine Draw.io files (blocked - waiting on T3)
   
3. [T6] Export final PNGs (blocked - waiting on T5)
```

---

## Boundaries

### NEVER Do (Hard Rules)

These rules are absolute and must not be violated:

1. **NEVER use /replace-ascii-diagrams to resume interrupted work**
   - `/replace-ascii-diagrams` is a START command only.
   - To resume, always use `/progress-work WI-XXX`.
   - If existing activity found, inform user and suggest `/progress-work`.

2. **NEVER replace ASCII without user verification of PNG**
   - Generate PNG first, present for verification.
   - User must confirm PNG matches ASCII intent.
   - Only proceed to Draw.io after PNG approval.

3. **NEVER generate Draw.io before PNG is verified**
   - Draw.io is generated FROM the verified PNG.
   - This ensures Draw.io matches what user approved.
   - The flow is: ASCII → PNG (verify) → Draw.io.

4. **NEVER use verification PNG as final image**
   - Verification PNG is a checkpoint, not the final artifact.
   - Final PNG must be exported from Draw.io after manual refinement.
   - Human exports the production PNG.

5. **NEVER modify diagram semantics during conversion**
   - If ASCII shows A → B → C, don't change to A → C → B.
   - Preserve all relationships, arrows, and hierarchies exactly.
   - Layout can change for clarity; meaning cannot.

6. **NEVER skip the discovery report**
   - Always present found diagrams to user before generating.
   - User may want to exclude certain diagrams.
   - User may identify additional context.

7. **NEVER assume diagram intent**
   - If unclear what an ASCII element represents, ask the user.
   - Don't guess at labels or relationships.
   - Preserve ambiguity rather than resolve it incorrectly.

8. **NEVER create diagrams that violate Visual Standards**
   - Follow color scheme from visual-design-standard.md.
   - Include legends on all diagrams.
   - Meet accessibility requirements.

### ASK User First

Escalate to the user in these situations:

- ASCII diagram is ambiguous or unclear.
- Multiple possible interpretations exist.
- Diagram appears incomplete or broken.
- Context is needed to understand relationships.
- Elements don't fit standard diagram types.
- User should decide on layout approach.

### ALWAYS Do

1. **Request target folder first**
   - Never assume which folder to scan.
   - Get explicit path from user.
   - Confirm the scope before proceeding.

2. **Present discovery report before generation**
   - List all ASCII diagrams found.
   - Show source file and line numbers.
   - Include ASCII preview (truncated if long).
   - Get user confirmation to proceed.

3. **Generate PNG and Draw.io independently**
   - PNG from diagram description.
   - Draw.io from diagram structure.
   - Both should match the original ASCII.

4. **Create verification checkpoint after each diagram**
   - Show PNG to user.
   - Ask: "Does this PNG accurately represent the ASCII diagram?".
   - Only proceed when user confirms.

5. **Preserve original ASCII in git history**
   - The replacement commit should show the change.
   - User can revert if needed.
   - Document the replacement in commit message.

6. **Use consistent naming conventions**
   - `{source-doc}-{diagram-context}.drawio`
   - `{source-doc}-{diagram-context}.png`
   - Kebab-case, lowercase

7. **Place images at same level as source document**
   - Do NOT create `images/` or `diagrams/` subfolders
   - Keep PNG and Draw.io files alongside the markdown
   - Only create subfolders if explicitly instructed by user

8. **Add alt text to image links**
   - Use diagram title/purpose as alt text
   - Aids accessibility and search

9. **Track all replacements**
   - Log which ASCII was replaced with which image
   - Include line numbers for traceability

10. **Use work management for batch operations (6+ diagrams or multiple files)**
   - Create activity in relevant work item's progress.yaml
   - Track per-diagram status in diagram-progress.yaml
   - Claim activity lock before working
   - Update progress after each diagram completes
   - Release lock with progress update (NEVER without)
   - Enable other agents to resume from any point

11. **Update progress.yaml immediately when completing work**
    - Mark each task complete as soon as it's done (don't batch)
    - Update diagram-progress.yaml after each diagram
    - This enables accurate resume from interruption

## ASCII Diagram Detection

### Reliable Indicators

These patterns strongly indicate an ASCII diagram:

| Pattern | Example | Confidence |
|---------|---------|------------|
| Box corners | `+--+`, `┌──┐`, `╔══╗` | High |
| Arrows | `-->`, `->`, `=>`, `←`, `→` | Medium-High |
| Pipes + dashes | `\|---\|`, `+---+` | High |
| Tree branches | `├──`, `└──`, `│` | High |
| Multiple aligned pipes | `\|   \|   \|` | Medium |

### False Positives to Avoid

Don't treat these as ASCII diagrams:

| Pattern | What It Is |
|---------|-----------|
| `\| col \| col \|` | Markdown table |
| `-->` in prose | Arrow in text description |
| `---` alone | Markdown horizontal rule |
| Single `\|` | Markdown table delimiter |
| ` ``` ` blocks with `\|` | Code examples |

### Detection Heuristic

A block is likely an ASCII diagram if:

1. Multiple consecutive lines share structural characters (`+`, `\|`, `-`, arrows)
2. Lines appear to form visual alignment (boxes, flows)
3. Not inside a code fence (unless specifically diagram)
4. Has more than 3 lines of visual structure
5. Contains at least two of: box corners, arrows, or aligned pipes

## PNG Generation (Phase 4)

### Purpose

Initial PNG is generated to **verify** the agent correctly understands the ASCII diagram.

### Approach

PNG is generated by describing the ASCII diagram to an image generation tool:

1. **Analyze ASCII diagram** - Understand structure and relationships
2. **Write detailed description** - Describe shapes, layout, arrows, labels
3. **Generate PNG** - Use image generation with the description
4. **Present for verification** - User confirms PNG matches ASCII intent

### Description Template

```
A diagram showing:
- [Shape descriptions with positions]
- [Arrow/connector descriptions]
- [Labels and text]
- Using standard colors: Navy Blue (#003087), Orange (#FF6B35)
- Clean white background
- Legend in bottom-right corner
- [Specific layout requirements]
```

**Note**: This verification PNG is NOT the final artifact. The final PNG comes from Draw.io export after manual refinement.

## Draw.io Generation (Phase 6)

### Purpose

Draw.io is generated FROM the verified PNG to provide an editable source.

### Prerequisite

PNG must be verified by user before generating Draw.io. This ensures:
- Agent understood the ASCII correctly
- Draw.io will match what user approved
- No wasted effort on rejected diagrams

### Structure Translation

| PNG Element | Draw.io Element |
|-------------|-----------------|
| Rectangle with text | mxCell with rectangle style |
| Arrow/line | Edge connector |
| Bidirectional arrow | Connector with both ends |
| Dashed line | Edge with dashed style |
| Container | Parent cell with children |

### Layer Organization

Organize Draw.io elements in layers:

1. **Background** - Container shapes, swimlanes
2. **Components** - Boxes, shapes
3. **Connections** - Arrows, lines
4. **Labels** - Text annotations
5. **Legend** - Legend box

### Styling

Apply Visual Design Standards:

```xml
<mxCell style="rounded=1;fillColor=#003087;fontColor=#FFFFFF;strokeColor=#003087"/>
```

## Human Tasks (Phases 7-8)

### Manual Refinement (Phase 7)

After agent generates Draw.io, user must:

1. Open `.drawio` file in Draw.io application
2. Refine alignment, spacing, and layout
3. Verify all labels are correct
4. Ensure legend is complete
5. Save changes

### Final PNG Export (Phase 8)

User exports production PNG from Draw.io:

1. File → Export as → PNG
2. Set appropriate resolution
3. Replace verification PNG with exported version
4. Notify agent that human tasks are complete

**The final PNG is always exported from Draw.io by the human, not generated by the agent.**

## Replacement Process

### Before Replacement

1. ASCII diagram exists in markdown
2. PNG and Draw.io files exist
3. User has verified PNG matches ASCII intent
4. User has approved replacement

### Replacement Format

Replace:
```markdown
```
+---+     +---+
| A | --> | B |
+---+     +---+
```
```

With:
```markdown
![Component flow diagram](./component-flow.png)

*Source: [component-flow.drawio](./component-flow.drawio)*
```

### After Replacement

1. PNG displays inline in markdown viewers
2. Draw.io link available for editing
3. Alt text provides accessibility
4. Original ASCII preserved in git history

## Error Handling

### Detection Failures

If no ASCII diagrams found:
- Report to user
- Ask if they expected diagrams
- Offer to check specific files

### Generation Failures

If diagram generation fails:
- Report which diagram failed
- Show the ASCII that couldn't be converted
- Ask user for guidance

### Verification Failures

If user rejects a PNG:
- Ask what's wrong
- Get specific feedback
- Regenerate with corrections
- Re-verify before proceeding

## See Also

- [replace-ascii-diagrams.md](replace-ascii-diagrams.md) - Full workflow documentation
- [README.md](README.md) - Overview and concepts
- [05-governance/standards/visual-design/visual-design-standard.md](../../05-governance/standards/visual-design/visual-design-standard.md) - Visual standards
- [../work-management/AGENTS.md](../work-management/AGENTS.md) - Work management agent rules
- [../work-management/progress-work.md](../work-management/progress-work.md) - Progress tracking protocol
