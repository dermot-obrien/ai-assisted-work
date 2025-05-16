# Start Work Agent

Initialize a new work item with proper structure and tracking.

## Purpose

Create the foundational artifacts for a new piece of work:
- `scope.md` - Define what's in and out of scope
- `plan.md` - Break down into activities and tasks
- `progress.yaml` - Initialize tracking

## Prerequisites

- Clear understanding of the work to be done
- Work item ID (or generate one)
- Target location for work item folder

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Work description | Yes | What needs to be accomplished |
| Work item ID | No | e.g., WI-001 (auto-generate if not provided) |
| Target path | No | Where to create work item folder |

## Steps

1. **Understand the work**
   - Read the work description carefully
   - Identify the main objective
   - Note any constraints or dependencies mentioned

2. **Create work item folder**
   ```
   {target_path}/{work_item_id}/
   ```

3. **Create scope.md**
   - Document the objective clearly
   - List what IS in scope (specific deliverables)
   - List what is NOT in scope (explicit exclusions)
   - Note constraints
   - Identify dependencies

4. **Create plan.md**
   - Break work into Activities (A1, A2, ...)
   - Break activities into Tasks (T1, T2, ...)
   - For each task:
     - Clear description
     - Actor: Agent or Human
     - Effort: Low / Medium / High
     - Dependencies (if any)
   - Define deliverables

5. **Create progress.yaml**
   - Initialize metadata (ID, title, status)
   - Set status to `in_progress`
   - Initialize all tasks as `pending`
   - Set version to 1

6. **Create deliverables folder**
   ```
   {work_item_id}/deliverables/
   ```

7. **Report what was created**
   - List files created
   - Summarize scope
   - Show first task to work on

## Outputs

| Output | Description |
|--------|-------------|
| `scope.md` | Scope definition document |
| `plan.md` | Work breakdown with tasks |
| `progress.yaml` | Status tracking file |
| `deliverables/` | Folder for outputs |

## Example

### Input

```
Work description: Research and document best practices for API versioning
Work item ID: WI-042
```

### Generated Files

**scope.md**:
```markdown
# WI-042: API Versioning Best Practices

## Objective
Research and document best practices for API versioning.

## In Scope
- Research current API versioning approaches
- Document pros and cons of each approach
- Provide recommendations

## Out of Scope
- Implementation of versioning
- Specific API changes

## Constraints
- Focus on REST APIs

## Dependencies
- None
```

**plan.md**:
```markdown
# WI-042 Plan

## Activities

### A1: Research

| Task ID | Task | Actor | Effort | Status |
|---------|------|-------|--------|--------|
| A1-T1 | Research URL path versioning | Agent | Low | ⬜ |
| A1-T2 | Research header versioning | Agent | Low | ⬜ |
| A1-T3 | Research query param versioning | Agent | Low | ⬜ |

### A2: Documentation

| Task ID | Task | Actor | Effort | Status |
|---------|------|-------|--------|--------|
| A2-T1 | Draft comparison document | Agent | Medium | ⬜ |
| A2-T2 | Review and finalize | Human | Low | ⬜ |

## Deliverables
- D01: API Versioning Best Practices Guide
```

**progress.yaml**:
```yaml
version: 1
last_modified: "2026-02-01T10:00:00Z"
work_item:
  id: "WI-042"
  title: "API Versioning Best Practices"
  status: "in_progress"
  started_at: "2026-02-01T10:00:00Z"
activities:
  - id: "A1"
    title: "Research"
    status: "pending"
    tasks:
      - id: "A1-T1"
        title: "Research URL path versioning"
        status: "pending"
        actor: "agent"
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Work item ID exists | Prompt for new ID or confirm overwrite |
| Invalid target path | Create path or prompt for valid location |
| Missing description | Request work description before proceeding |
| Vague scope | Ask clarifying questions |

## Tips

- Be specific in scope - vague scope leads to scope creep
- Break tasks small enough to complete in one session
- Identify human tasks vs agent tasks clearly
- Include a review task for quality control
