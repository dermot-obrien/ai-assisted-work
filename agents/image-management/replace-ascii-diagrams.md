# Replace ASCII Diagrams

Scan documents for ASCII diagrams and replace them with professional Draw.io diagrams and PNG images.

**Command Type:** START command - creates activity, then uses standard progress-work flow.

**To resume interrupted work:** Use `/progress-work WI-XXX` (NOT this command).

**See also:**
- [README.md](README.md) - Core concepts, motivation, and conventions
- [AGENTS.md](AGENTS.md) - Agent rules and boundaries
- [../work-management/progress-work.md](../work-management/progress-work.md) - Resume protocol

## Command Behavior

| Scenario | Action |
|----------|--------|
| Fresh start (no existing activity) | Discovery → Create activity → Begin work |
| Existing incomplete activity found | Inform user, suggest `/progress-work WI-XXX` |
| Explicitly requested new scope | Create new activity (different folder/files) |

### Start vs Resume

```
/replace-ascii-diagrams                  /progress-work WI-XXX
────────────────────────                 ─────────────────────
• Creates NEW activity                   • Resumes EXISTING activity
• Performs discovery phase               • Loads workflow state
• Initializes workflow state file        • Continues from interruption point
• For starting fresh work                • For continuing any work type
```

## Overview

This workflow converts ASCII art diagrams in markdown documents to:

1. **Draw.io files** (`.drawio`) - Editable source diagrams for long-term maintenance
2. **PNG images** (`.png`) - Display images exported from Draw.io

### Philosophy

AI agents should be **free to generate ASCII art** during content development. ASCII diagrams are fast to create, easy to iterate, and version-control friendly.

Conversion to formal images happens **only when document content is stable** - converting too early creates maintenance burden.

### The Conversion Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CURATE DOCUMENT                                             │
│     Confirm content is stable and ready for formal images       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GENERATE PNG FROM ASCII                                     │
│     AI generates PNG based on ASCII diagram description         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. VERIFY PNG MATCHES ASCII                                    │
│     User confirms the PNG accurately represents the ASCII       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. GENERATE DRAW.IO FROM PNG                                   │
│     AI creates Draw.io that matches the verified PNG            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. MANUAL REFINEMENT (Human Task)                              │
│     User refines Draw.io for professional quality               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. EXPORT FINAL PNG FROM DRAW.IO (Human Task)                  │
│     User exports production PNG from refined Draw.io            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. REPLACE ASCII IN DOCUMENT                                   │
│     Swap ASCII for final PNG image link                         │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Phases

| Phase | Purpose | Actor |
|-------|---------|-------|
| **1. Pre-check** | Confirm document is curated and stable | Agent + User |
| **2. Setup** | Get target folder from user | Agent |
| **3. Discovery** | Scan and identify ASCII diagrams | Agent |
| **3a. Work Management** | Create activity if batch operation (6+ diagrams) | Agent |
| **4. PNG Generation** | Create PNG from ASCII description | Agent |
| **5. PNG Verification** | Confirm PNG matches ASCII | User |
| **6. Draw.io Generation** | Create Draw.io from verified PNG | Agent |
| **7. Manual Refinement** | Refine Draw.io for quality | Human |
| **8. Final Export** | Export PNG from Draw.io | Human |
| **9. Replacement** | Replace ASCII with final PNG | Agent |

---

## Work Management Integration

For batch operations (6+ diagrams or multiple files), integrate with the work management system to enable **parallel work** and **resume from interruption**.

### When to Use Work Management

| Diagram Count | Files | Action |
|---------------|-------|--------|
| 1-5 | Single file | Optional - complete in session |
| 6+ | Any | **Required** - create work item activity |
| Any | Multiple | **Required** - create work item activity |
| Part of existing work item | Any | **Required** - add activity to work item |

### Work Management Setup (Phase 3a)

After discovery and before PNG generation:

1. **Check if work item exists** for the target folder
   - Look in `00-change/work-items/` for related work items
   - If none exists and diagram count is high, consider creating one

2. **Create or update activity** in `progress.yaml`
   - Add activity with standardized task structure
   - Reference the diagram-progress.yaml tracking file

3. **Create diagram-progress.yaml** in work item folder
   - Track per-diagram status for resume capability
   - Update after each diagram operation completes

4. **Claim activity lock** before starting work
   - Follow work management lock protocol
   - Include `current_diagram` in lock for fine-grained resume

### Diagram Progress Tracking File

Create `diagram-progress.yaml` in the work item folder:

```yaml
# WI-XXX-diagram-progress.yaml
# Per-diagram status for ASCII replacement activity

metadata:
  activity_id: WI-XXX-A{N}
  created: "2026-02-01T09:00:00Z"
  last_updated: "2026-02-01T10:30:00Z"
  total_diagrams: 25
  completed: 12
  
diagrams:
  - id: D001
    source_file: "deliverables/D03-integration-patterns.md"
    source_lines: "45-67"
    title: "Data Integration Flow"
    type: flow
    status: replaced  # See status states below
    png_file: "deliverables/images/D03-data-integration-flow.png"
    drawio_file: "deliverables/images/D03-data-integration-flow.drawio"
    verified_at: "2026-02-01T10:00:00Z"
    verified_by: "user"
    replaced_at: "2026-02-01T10:30:00Z"
    notes: null

  - id: D002
    source_file: "deliverables/D03-integration-patterns.md"
    source_lines: "89-112"
    title: "RAG Architecture"
    type: architecture
    status: png_generated
    png_file: "deliverables/images/D03-rag-architecture.png"
    drawio_file: null
    verified_at: null
    verified_by: null
    replaced_at: null
    notes: "Awaiting user verification"
```

### Diagram Status States

| Status | Phase | Next Action | Can Resume From |
|--------|-------|-------------|-----------------|
| `discovery` | 3 | Generate PNG | Yes - agent generates PNG |
| `png_pending` | 4 | Generate PNG | Yes - agent generates PNG |
| `png_generated` | 4 | Verify PNG | Yes - human verifies |
| `png_verified` | 5 | Generate Draw.io | Yes - agent generates |
| `drawio_generated` | 6 | Refine Draw.io | Yes - human refines |
| `drawio_refined` | 7 | Export final PNG | Yes - human exports |
| `ready_to_replace` | 8 | Replace ASCII | Yes - agent replaces |
| `replaced` | 9 | Complete | N/A - done |
| `skipped` | Any | None | N/A - intentionally skipped |

### Resume Protocol

When resuming diagram replacement work:

**Step 1: Read work item state**
```
1. Read progress.yaml - get activity status and current task
2. Check locks/ folder - verify no other agent is working
3. Read diagram-progress.yaml - find last completed diagram
```

**Step 2: Verify outputs exist**
```
For each diagram with status >= png_generated:
  - Verify PNG file exists
  - Verify Draw.io file exists (if status >= drawio_generated)
  - If file missing, reset diagram status
```

**Step 3: Resume from next incomplete**
```
Find first diagram where:
  - status != 'replaced' AND status != 'skipped'
  - status matches current task phase

Example: If task is T4 (Draw.io generation), resume from
         first diagram with status = 'png_verified'
```

**Step 4: Claim activity lock**
```json
{
  "holder": "ai-agent-cursor",
  "holder_type": "agent",
  "acquired": "2026-02-01T09:00:00Z",
  "expires": "2026-02-01T10:00:00Z",
  "task_id": "WI-006-A18-T2",
  "current_diagram": "D013",
  "resume_from": "png_pending"
}
```

### Progress Update Protocol

**After each diagram operation:**

1. Update diagram status in `diagram-progress.yaml`
2. Update `metadata.completed` count
3. Update `metadata.last_updated` timestamp
4. If all diagrams reach phase milestone, update task status in `progress.yaml`

**Before releasing activity lock:**

1. **ALWAYS** update progress.yaml with task completion status
2. **ALWAYS** update diagram-progress.yaml with final state
3. Append to changelog.log with summary

### Parallel Work (Multiple Files)

When many diagrams span multiple files, enable parallel work:

**Option A: Single activity, parallel-safe tracking**
- One activity covers all files
- diagram-progress.yaml tracks per-diagram status
- Lock file indicates `current_file` for coordination

**Option B: Sub-activities per file**
```yaml
- id: WI-006-A18a
  title: "ASCII Diagram Replacement - D03-integration-patterns"
  # ...6 diagrams in this file
  
- id: WI-006-A18b
  title: "ASCII Diagram Replacement - D15-risk-assessment"
  # ...5 diagrams in this file
```

Different agents can claim different sub-activities.

### Manual Tasks Report

When human tasks block progress, generate report:

```
=== MANUAL TASKS REPORT ===
Work Item: WI-006 - FutureSecure AI Architecture
Activity: WI-006-A18 - ASCII Diagram Replacement
Generated: 2026-02-01T10:00:00Z

PENDING HUMAN TASKS (in order):

1. [AVAILABLE] WI-006-A18-T3: Verify PNG images
   Diagrams awaiting verification: D001, D002, D003, D004, D005
   Location: deliverables/images/
   Instructions: Compare each PNG against original ASCII
   Unblocks: T4 (Draw.io generation)

2. [BLOCKED] WI-006-A18-T5: Refine Draw.io files
   Waiting on: T3 (verification), T4 (generation)
   
3. [BLOCKED] WI-006-A18-T6: Export final PNGs
   Waiting on: T5 (refinement)

SUMMARY:
- Total diagrams: 25
- PNG generated: 12
- PNG verified: 0
- Draw.io generated: 0
- Ready to replace: 0
- Replaced: 0

RECOMMENDED ACTION:
Complete PNG verification (T3) to unblock Draw.io generation.
Agent will resume T4 after T3 is marked complete.
```

---

## Phase 0: Check for Existing Work

**Purpose**: Detect if there's already an incomplete diagram replacement activity.

### Step 0.1: Scan for Existing Activities

Before starting discovery, check for existing work:

1. **If user specified a work item** (e.g., folder is within WI-XXX):
   - Read `progress.yaml` for that work item
   - Look for activities with `workflow: "image-management/replace-ascii-diagrams"`
   - Check if any are `status: in_progress` or `status: pending`

2. **If no work item specified**:
   - Scan `00-change/work-items/*/progress.yaml`
   - Look for diagram replacement activities targeting the same folder

### Step 0.2: Handle Existing Work

**If incomplete activity found:**

```
Found existing diagram replacement activity:

Work Item: WI-006 - FutureSecure AI Architecture
Activity: WI-006-A18 - ASCII Diagram Replacement
Status: in_progress (12/26 diagrams at png_generated)
Current Task: T2 - Generate PNG images

To continue this work, use:
  /progress-work WI-006

To start NEW replacement work (different scope), confirm you want to proceed.
```

**User options:**
- **Continue existing**: User runs `/progress-work WI-XXX`
- **Start new scope**: User confirms, agent creates new activity for different folder/files

### Step 0.3: Proceed with Fresh Start

If no existing work found, or user confirmed new scope, proceed to Phase 1.

---

## Phase 1: Pre-check

**Purpose**: Confirm the document(s) are curated and ready for image conversion.

### Step 1.1: Explain the Timing

```
## Pre-check: Document Curation Status

Before converting ASCII diagrams to images, please confirm:

1. **Content Stability** - Is the document content stable? 
   Converting ASCII to images creates maintenance overhead.
   Only convert when the content is unlikely to change significantly.

2. **ASCII Diagram Quality** - Are the ASCII diagrams accurate?
   The conversion will faithfully reproduce what's in the ASCII.
   Any corrections should be made to the ASCII first.

3. **Ready for Publication** - Is this document ready for formal review?
   Professional images signal "this is ready for stakeholders."
```

### Step 1.2: Get Curation Confirmation

```
Is this document (or folder of documents) curated and ready for image conversion?

- [Yes] - Content is stable, proceed with conversion
- [Not yet] - I'll come back when it's ready
- [Partially] - Some documents are ready, let me specify which
```

**If "Not yet"**: End workflow gracefully. Advise user to return when ready.

**If "Partially"**: Get list of specific files to process.

---

## Phase 2: Setup

**Purpose**: Establish scope and confirm target folder.

### Step 2.1: Request Target Folder

Ask the user for the folder path to scan:

```
Which folder should I scan for ASCII diagrams?

Please provide the path relative to the repository root, e.g.:
- `00-change/work-items/WI-006-futuresecure-ai-architecture/`
- `05-governance/standards/`
- `03-building-blocks/patterns/`

I'll recursively scan all markdown files in this folder.
```

### Step 2.2: Validate Folder

1. Verify the folder exists
2. Count markdown files found
3. Confirm scope with user:

```
Found {N} markdown files in `{path}`:
- {list top 10 files}
{- ... and {M} more}

Proceed with scanning these files for ASCII diagrams?
```

---

## Phase 3: Discovery

**Purpose**: Find all ASCII diagrams in the target documents.

### Step 3.1: Scan Documents

For each markdown file:

1. Read file content
2. Apply ASCII diagram detection heuristics (see [AGENTS.md](AGENTS.md))
3. Record diagram location and content

### Step 3.2: Classify Diagrams

For each detected diagram, classify:

| Field | Description |
|-------|-------------|
| `id` | Sequential ID (e.g., `D001`, `D002`) |
| `source_file` | Path to containing document |
| `line_start` | Starting line number |
| `line_end` | Ending line number |
| `type` | Box, flow, tree, sequence, or unknown |
| `preview` | First 5 lines of ASCII |
| `elements` | Count of boxes, arrows, etc. |

### Step 3.3: Present Discovery Report

Show user what was found:

```
## ASCII Diagram Discovery Report

**Folder**: `{path}`
**Files Scanned**: {N}
**Diagrams Found**: {M}

---

### D001: Component Architecture
**File**: `architecture.md` (lines 45-67)
**Type**: Box diagram
**Elements**: 5 boxes, 6 arrows

Preview:
```
+-------------+      +-------------+
| Component A | ---> | Component B |
+-------------+      +-------------+
       |
       v
+-------------+
| Component C |
+-------------+
```

---

### D002: Data Flow
**File**: `data-processing.md` (lines 123-145)
**Type**: Flow diagram
**Elements**: 4 stages, 3 arrows

Preview:
```
Input --> Process --> Transform --> Output
```

---

**Excluded** (not ASCII diagrams):
- `readme.md` line 34: Markdown table (false positive)
- `spec.md` line 89: Code example (in fence)

---

Would you like to:
1. Proceed with all {M} diagrams
2. Exclude specific diagrams
3. Add diagrams I may have missed
```

### Step 3.4: Finalize Diagram List

Based on user feedback:
- Remove excluded diagrams
- Add manually identified diagrams
- Confirm final list

### Step 3.5: Initialize Work Management (if batch operation)

**Trigger**: 6+ diagrams OR multiple source files OR part of existing work item

1. **Find or create work item**
   - Check if target folder is part of an existing work item
   - If yes, add activity to that work item
   - If no and scope is large, consider creating work item

2. **Create activity in progress.yaml**
   ```yaml
   - id: WI-XXX-A{N}
     title: "ASCII Diagram Replacement"
     status: in_progress
     actor: any
     depends_on: []
     tasks:
       - id: WI-XXX-A{N}-T1
         title: "Scan and document ASCII diagrams"
         status: completed  # Just finished discovery
         actor: agent
       - id: WI-XXX-A{N}-T2
         title: "Generate PNG images (batch)"
         status: in_progress
         actor: agent
       # ... remaining tasks
   ```

3. **Create diagram-progress.yaml**
   - Initialize with all diagrams from discovery
   - Set initial status to `discovery` or `png_pending`
   - Track metadata (counts, timestamps)

4. **Claim activity lock**
   ```json
   {
     "holder": "ai-agent-cursor",
     "holder_type": "agent", 
     "acquired": "2026-02-01T09:00:00Z",
     "expires": "2026-02-01T10:00:00Z",
     "task_id": "WI-XXX-A{N}-T2",
     "current_diagram": "D001"
   }
   ```

5. **Append to changelog.log**
   ```
   {"timestamp":"...","worker":"ai-agent-cursor","action":"claimed_activity","activity_id":"WI-XXX-A{N}","details":"Starting PNG generation for 25 diagrams"}
   ```

---

## Phase 4: PNG Generation

**Purpose**: Create initial PNG images from ASCII diagrams for verification.

### Step 4.1: Generate PNG from ASCII

For each diagram in the list:

1. **Analyze ASCII structure**
   - Identify components (boxes, labels)
   - Map relationships (arrows, lines)
   - Note hierarchy and layout

2. **Write detailed description**
   - Describe all elements and their positions
   - Note colors, styles, and relationships
   - Include layout requirements

3. **Generate PNG**
   - Use image generation with the description
   - Save as `{source-doc}-{context}.png`

**Note**: This PNG is for verification only. The final PNG will be exported from Draw.io after manual refinement.

### Step 4.2: PNG Description Template

Generate PNG using a detailed description:

```
Create a professional architecture diagram with the following elements:

LAYOUT:
- Horizontal flow from left to right
- White background
- 40px margins on all sides

COMPONENTS:
1. Rectangle labeled "Component A" in Navy Blue (#003087) with white text
   - Position: left side
   - Size: 120x60 pixels
2. Rectangle labeled "Component B" in Navy Blue (#003087) with white text
   - Position: right of Component A
   - Size: 120x60 pixels
3. Arrow connecting Component A to Component B
   - Style: solid line with filled arrowhead
   - Color: dark gray (#333333)

LEGEND (bottom-right corner):
- Box: "Component" with blue fill
- Arrow: "Data flow"

STYLE:
- Font: Sans-serif (Helvetica-like)
- Rounded corners on rectangles (4px radius)
- Clean, minimal design
- Professional appearance suitable for enterprise documentation
```

### Step 4.3: File Naming

Determine appropriate filename:

1. Extract source document name (without extension)
2. Identify diagram context from:
   - Preceding heading in markdown
   - First meaningful label in diagram
   - Fallback: `diagram-{N}`
3. Combine: `{source-doc}-{context}.{ext}`

Examples:
- `architecture-component-layout.png`
- `data-flow-order-processing.png`
- `security-auth-flow.png`

### Step 4.4: File Placement

**Default: Same level as source document** (no subfolders)

```
folder/
├── document.md
├── document-diagram-1.png
├── document-diagram-1.drawio
├── document-diagram-2.png
├── document-diagram-2.drawio
└── ...
```

**Only create subfolders if explicitly instructed by user.**

File naming convention:
- `{source-doc}-{diagram-context}.png`
- `{source-doc}-{diagram-context}.drawio`

Example for `D03-integration-patterns.md`:
- `D03-data-integration-flow.png`
- `D03-rag-integration-pattern.png`

### Step 4.5: Update Progress (if using work management)

After generating each PNG:

1. **Update diagram-progress.yaml**
   ```yaml
   - id: D001
     status: png_generated  # Changed from png_pending
     png_file: "deliverables/images/D03-data-flow.png"
   ```

2. **Update lock file current_diagram**
   ```json
   { "current_diagram": "D002" }
   ```

3. **If interrupted**, progress is preserved
   - Another agent can read diagram-progress.yaml
   - Resume from first diagram with `status: png_pending`

4. **When all PNGs generated**, update progress.yaml
   ```yaml
   - id: WI-XXX-A{N}-T2
     status: completed
     completed_at: "2026-02-01T10:00:00Z"
   - id: WI-XXX-A{N}-T3
     status: awaiting_human  # Next task needs human
   ```

---

## Phase 5: PNG Verification

**Purpose**: User confirms PNG accurately represents the original ASCII.

### Step 5.1: Present Each PNG for Review

For each generated PNG:

```
## Verification: D001 - Component Architecture

**Source**: `architecture.md` lines 45-67

### Original ASCII:
```
+-------------+      +-------------+
| Component A | ---> | Component B |
+-------------+      +-------------+
```

### Generated PNG:
![D001 PNG](./architecture-component-layout.png)

### Questions:
1. Does the PNG accurately represent the ASCII diagram's **intent**?
2. Are all components present and correctly labeled?
3. Are relationships (arrows) correctly represented?
4. Is the layout acceptable?

**Options:**
- [Approve] - PNG matches ASCII intent, proceed to Draw.io generation
- [Revise] - Describe what needs to change
- [Skip] - Don't convert this diagram
```

### Step 5.2: Handle Revisions

If user requests revision:

1. Ask for specific feedback
2. Note what needs to change
3. Regenerate PNG with corrections
4. Re-present for verification

### Step 5.3: Track Verification Status

Maintain status for each diagram:

| ID | PNG Status | Notes |
|----|------------|-------|
| D001 | Approved | Ready for Draw.io |
| D002 | Revised | Added missing label |
| D003 | Skipped | User prefers ASCII |
| D004 | Pending | Awaiting review |

### Step 5.4: Update Progress (if using work management)

After each verification decision:

1. **Update diagram-progress.yaml**
   ```yaml
   - id: D001
     status: png_verified  # or 'skipped'
     verified_at: "2026-02-01T10:15:00Z"
     verified_by: "user"
     notes: "Approved - matches ASCII intent"
   ```

2. **When all PNGs verified**, update progress.yaml
   ```yaml
   - id: WI-XXX-A{N}-T3
     status: completed
     completed_by: "user"
     completed_at: "2026-02-01T10:30:00Z"
   ```

3. **Agent can now claim T4** (Draw.io generation)
   - Read progress.yaml to see T3 is complete
   - Find diagrams with `status: png_verified`
   - Proceed with Draw.io generation

---

## Phase 6: Draw.io Generation

**Purpose**: Create editable Draw.io files based on verified PNGs.

### Step 6.1: Generate Draw.io from PNG

For each PNG-approved diagram:

1. **Analyze the verified PNG**
   - Identify all shapes and their positions
   - Map connectors and relationships
   - Note colors and styling

2. **Create Draw.io XML**
   - Build structure matching the PNG
   - Apply organization visual standards
   - Include legend
   - Save as `{source-doc}-{context}.drawio`

### Step 6.2: Draw.io Structure

Use this XML template structure:

```xml
<mxfile>
  <diagram name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Components -->
        <mxCell id="component-a" value="Component A" 
                style="rounded=1;fillColor=#003087;fontColor=#FFFFFF;strokeWidth=2"
                vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>
        <!-- Connectors -->
        <mxCell id="arrow-1" 
                style="edgeStyle=orthogonalEdgeStyle;endArrow=block;endFill=1"
                edge="1" parent="1" source="component-a" target="component-b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <!-- Legend -->
        <mxCell id="legend" value="Legend..." 
                style="rounded=0;fillColor=#F5F5F5"
                vertex="1" parent="1">
          <mxGeometry x="800" y="600" width="200" height="150" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### Step 6.3: Present Draw.io Files

```
## Draw.io Files Created

The following Draw.io files have been created based on verified PNGs:

| Diagram | PNG | Draw.io |
|---------|-----|---------|
| D001 | component-layout.png | component-layout.drawio |
| D002 | data-flow.png | data-flow.drawio |

**Next Steps (Human Tasks):**
1. Open each `.drawio` file in Draw.io (desktop or diagrams.net)
2. Refine the diagram as needed (alignment, spacing, labels)
3. Export final PNG from Draw.io (File → Export as → PNG)
4. Replace the verification PNG with your exported PNG
5. Return here to complete the ASCII replacement
```

### Step 6.4: Update Progress (if using work management)

After generating each Draw.io file:

1. **Update diagram-progress.yaml**
   ```yaml
   - id: D001
     status: drawio_generated
     drawio_file: "deliverables/images/D03-data-flow.drawio"
   ```

2. **When all Draw.io files generated**, update progress.yaml
   ```yaml
   - id: WI-XXX-A{N}-T4
     status: completed
     completed_at: "2026-02-01T11:00:00Z"
   - id: WI-XXX-A{N}-T5
     status: awaiting_human  # Manual refinement needed
   - id: WI-XXX-A{N}-T6
     status: awaiting_human  # Final export needed
   ```

3. **Generate Manual Tasks Report** for human phases

---

## Phase 7: Manual Refinement (Human Task)

**Purpose**: User refines Draw.io diagrams for professional quality.

**Actor**: Human

This phase is performed by the user outside the agent workflow:

1. **Open Draw.io file** in Draw.io desktop app or diagrams.net
2. **Review and refine**:
   - Adjust alignment and spacing
   - Refine labels and text
   - Ensure legend is complete
   - Verify organization color standards
3. **Save changes** to the `.drawio` file

---

## Phase 8: Final PNG Export (Human Task)

**Purpose**: User exports production PNG from refined Draw.io.

**Actor**: Human

This phase is performed by the user outside the agent workflow:

1. **Open refined Draw.io** file
2. **Export as PNG**:
   - File → Export as → PNG
   - Set appropriate resolution (2x for retina displays)
   - Include transparent background if appropriate
3. **Replace verification PNG** with exported PNG
4. **Notify agent** that export is complete

---

## Phase 9: Replacement

**Purpose**: Replace approved ASCII diagrams with final PNG image links.

### Step 9.1: Confirm Readiness

```
## Ready to Replace ASCII Diagrams

Before proceeding, please confirm:

1. [ ] Draw.io files have been manually refined
2. [ ] Final PNGs have been exported from Draw.io
3. [ ] Exported PNGs have replaced the verification PNGs

Are all human tasks complete and ready for replacement?
```

### Step 9.2: Confirm Replacement

Before making changes:

```
## Ready to Replace

**Approved diagrams**: {N}
**Skipped diagrams**: {M}

The following ASCII diagrams will be replaced with final PNG images:

| ID | File | Lines | PNG | Draw.io |
|----|------|-------|-----|---------|
| D001 | architecture.md | 45-67 | component-layout.png | component-layout.drawio |
| D002 | data-flow.md | 123-145 | order-processing.png | order-processing.drawio |

**Note**: Original ASCII will be preserved in git history.

Proceed with replacement?
```

### Step 9.3: Execute Replacements

For each approved diagram:

1. **Read source file**
2. **Locate ASCII block** (by line numbers)
3. **Build replacement content**:

```markdown
![{Diagram title}]({relative-path-to-png})

*Editable source: [{drawio-filename}]({relative-path-to-drawio})*
```

4. **Replace ASCII with image link**
5. **Save file**

### Step 9.4: Replacement Format

**Standard replacement:**

```markdown
![Component architecture showing data flow between services](./diagrams/component-layout.png)

*Editable source: [component-layout.drawio](./diagrams/component-layout.drawio)*
```

**With figure caption:**

```markdown
<figure>
  <img src="./diagrams/component-layout.png" alt="Component architecture showing data flow between services">
  <figcaption>Figure 1: Component Architecture</figcaption>
</figure>

*Editable source: [component-layout.drawio](./diagrams/component-layout.drawio)*
```

### Step 9.5: Generate Summary Report

After all replacements:

```
## Replacement Complete

**Files Modified**: {N}
**Diagrams Replaced**: {M}
**Diagrams Skipped**: {K}

### Changes Made:

| File | Diagrams Replaced |
|------|-------------------|
| architecture.md | D001, D002 |
| data-flow.md | D003 |

### Files Created:

| File | Type |
|------|------|
| diagrams/component-layout.drawio | Draw.io source |
| diagrams/component-layout.png | PNG image |
| diagrams/order-processing.drawio | Draw.io source |
| diagrams/order-processing.png | PNG image |

### Next Steps:
1. Review changes in your editor
2. Verify images display correctly
3. Commit changes when satisfied
```

---

## Error Handling

### No Diagrams Found

```
No ASCII diagrams were found in `{path}`.

This could mean:
1. Documents don't contain ASCII diagrams
2. ASCII patterns weren't recognized (please share examples)
3. Wrong folder was specified

Would you like to:
- Try a different folder
- Show me a specific file to check
- Describe what kind of diagrams you're looking for
```

### Generation Failure

```
Failed to generate diagram for D{N}:

**Source**: `{file}` lines {start}-{end}
**Error**: {description}

**ASCII content**:
```
{ascii preview}
```

**Options**:
- Skip this diagram and continue
- Provide additional context about the diagram
- Try with a simplified version
```

### File Write Failure

```
Could not save `{filename}`:
**Error**: {description}

**Options**:
- Retry
- Choose a different location
- Skip this file
```

---

## Important Rules

1. **Curate first** - Only convert ASCII when document content is stable
2. **Sequential verification** - PNG before Draw.io, verification at each step
3. **PNG from ASCII** - Initial PNG is generated from ASCII description
4. **Draw.io from PNG** - Draw.io is generated from the verified PNG
5. **Final PNG from Draw.io** - Production PNG is exported by human from Draw.io
6. **Preserve semantics** - Don't change diagram meaning during conversion
7. **Follow naming conventions** - Consistent, descriptive filenames
8. **Include legends** - Every Draw.io diagram needs a legend
9. **Add alt text** - All image links need descriptive alt text
10. **Follow visual standards** - Use your organization's design standard colors and styles

### Work Management Rules (Batch Operations)

11. **Use work management for 6+ diagrams** - Create activity and track progress
12. **Track per-diagram status** - Use diagram-progress.yaml for resume capability
13. **Claim activity lock before working** - Follow work management protocol
14. **Update progress immediately** - After each diagram operation completes
15. **Never release lock without progress update** - Enables accurate resume
16. **Generate Manual Tasks Report** - When human tasks block progress
17. **Enable parallel work** - Use sub-activities for large multi-file operations
18. **Verify outputs on resume** - Check PNG/Draw.io files exist before continuing

---

## See Also

- [AGENTS.md](AGENTS.md) - Agent rules and boundaries (including work management integration)
- [README.md](README.md) - Overview and concepts
- [../work-management/AGENTS.md](../work-management/AGENTS.md) - Work management agent rules
- [../work-management/progress-work.md](../work-management/progress-work.md) - Progress tracking protocol
