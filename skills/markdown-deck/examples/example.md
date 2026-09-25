---
title: Knowledge Retrieval
description: A worked example of a document that is also a deck
version: "0.1"
status: Draft
---

# Knowledge Retrieval

<!-- deck:cover subtitle="How one document becomes a deck" date="25 September 2026" -->

This paragraph is part of the document and never appears on a slide, because no
`deck:slide` tag precedes the heading above it and the cover slide takes its text from
the tag rather than the body.

<!-- deck:slide label="Why grounding" -->

## Why grounding matters

Grounding is the largest single lever on answer accuracy. Without it, a model produces
text that is plausible rather than correct, and there is no way to show a reader where an
answer came from.

- Retrieval that ignores source permissions will surface content people cannot otherwise see
- An answer without a citation cannot be checked
- Staleness has to be signalled, not assumed

<!-- deck:skip -->
The detail behind this belongs in the document rather than on the slide. Permission-aware
retrieval is the difference between a demo and a service, and it is the single most likely
way a retrieval lane causes an incident. The control has to sit at query time, inside the
retrieval boundary, because filtering after the fact means the content has already been
read into the context window.
<!-- /deck:skip -->

<!-- deck:note -->
Pause here. This is the slide people argue with.
<!-- /deck:note -->

<!-- deck:slide label="The contract" -->

## The retrieval contract

Everything behind the seam is replaceable. Everything in front of it is repeatable, but
only if the contract carries what must not vary.

| Element | Why it cannot vary |
|---|---|
| Query expression | Every consumer has to express intent the same way |
| Caller identity | Retrieval cannot be permission-aware without it |
| Citation | An answer that cannot be traced cannot be trusted |
| Staleness signal | Consumers need to know when an answer is old |

## Not a slide

This section has no tag, so it stays in the document and never reaches the deck. That is
how one file carries more detail than the audience sees.
