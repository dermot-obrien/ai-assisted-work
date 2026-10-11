# Scoping (Phase 1)

Capture and refine the user's intent through interactive dialogue before any research or
planning. Start read-only for the dialogue, then switch to write operations to create the
scope documents.

## Step 1.1: Capture the initial instruction

Record the user's exact words verbatim. Do not paraphrase.

## Step 1.2: Ask clarifying questions

While still read-only, ask enough to understand:

- What they want to achieve, expressed as outcomes rather than solutions
- Why it matters, the context and motivation
- Constraints on time, technology and dependencies
- Success criteria, how they will know it is done

Useful openings:

- "What problem does this solve?"
- "Are there existing patterns in the workspace I should follow?"
- "What is out of scope for this work item?"
- "How will you verify this is complete?"

## Step 1.3: Confirm understanding

Summarise and get explicit confirmation before writing anything:

```
Based on our discussion, here's what I understand:

Intent: {refined understanding}
Outcomes: {what success looks like}
Constraints: {limitations}
Out of scope: {what's excluded}

Is this accurate? Anything to add or change? Move on to creating the scope document?
```

## Step 1.4: Offer a JIRA link (optional)

If the organisation tracks work in JIRA, offer to link the work item. Never auto-create a
ticket.

```
Would you like to link this work item to a JIRA ticket?

If yes, please create a ticket with:
  Project: [appropriate project]
  Summary: {work item title}
  Description: {refined intent summary}

Share the JIRA ticket URL and I'll link it to the work item.
If you prefer to skip JIRA integration, we can proceed without it.
```

If skipped, `artifacts.jira` stays null in `progress.yaml`.

## Step 1.5: Create the scope documents

Once intent is confirmed, create the work item folder (see "Creating the work item" in
SKILL.md), then write:

- `scope.md` from `assets/templates/scope.md`, the stakeholder-facing specification. Required.
- `scope-ai.md` from `assets/templates/scope-ai.md`, the agent addendum. Recommended.

Record any JIRA URL for later inclusion in `progress.yaml`.

### Which document gets what

| Content | Goes in | Rationale |
|---------|---------|-----------|
| Summary | `scope.md` | Stakeholders need it |
| Intent, synthesised | `scope.md` | Clean statement of what we are doing |
| Acceptance criteria | `scope.md` | Stakeholders review and approve these |
| In and out of scope | `scope.md` | Clear boundaries for every audience |
| Context and references | `scope.md` | Helpful for every audience |
| Original instruction, verbatim | `scope-ai.md` | Preserves the user's exact words |
| Clarifying questions and answers | `scope-ai.md` | Explains decision rationale |
| Decision rationale | `scope-ai.md` | Helps a later agent understand why |
| Agent-specific instructions | `scope-ai.md` | Terminology, boundaries, key concepts |

The Original User Instruction in `scope-ai.md` must be the user's exact words. The Intent in
`scope.md` is a clean synthesis for stakeholders.

### When to write scope-ai.md

Write it when the work item is complex, when the clarification dialogue was substantial, or
when a later agent will need the "why". Skip it for simple work items, bug fixes and
documentation updates where `scope.md` already carries everything needed.
