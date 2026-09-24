# Work Classification & Ceremony

The **nature of work** determines how much process it earns. This standard defines a
domain- and substrate-agnostic way to classify any piece of work and to apply only the
**ceremony appropriate to its class**.

It is the front-line model for AAW: triage classifies a unit of work, the class
determines which AAW artifacts and phases apply, and a separate routing policy decides
*where* the work is recorded. Most work is light; the heavy work-item workspace
(`WI-NNN/`) is reserved for the one class that genuinely needs it.

---

## Principle

> **Ceremony is a function of the nature of the work, not a fixed pipeline.**
> Default to the lightest class; escalate only on a positive classification signal.

This inverts the common default of "full pipeline with opt-outs." Here, **minimum
ceremony is the floor** and process is *added* as the work's impact and uncertainty rise.

---

## The three axes (domain-neutral)

Every unit of work is classified along three independent axes. None reference any domain.

1. **Certainty** — *Do we know what to do?*
   - `known` — a defined change; proceed to delivery.
   - `uncertain` — needs investigation first; becomes an **inquiry** (research resolves it
     into a known change, or closes it as a lesson).

2. **Impact (blast radius)** — *How far does it reach?*
   - `none` — no change to observable behaviour or outputs (cosmetic, docs, internal-only).
   - `local` — changes the behaviour/output of a single unit/component.
   - `cross-cutting` — changes shared concerns, conventions, safety, or many/all units.

3. **Kind** — *Behaviour-change or enabler?*
   - `behaviour-change` — alters what the system produces; **must** trace to a rationale or
     hypothesis; carries a version consequence.
   - `enabler` — infrastructure, tooling, safety, observability, reporting; supports work
     without changing domain outputs.

---

## Work classes & the ceremony each earns

The axes collapse into four classes. Ceremony is expressed in AAW's own artifacts
(see [README.md](README.md)); version impact uses semantic versioning (itself
domain-neutral).

| Class | Axes | Ceremony — AAW artifacts it earns | Phases | Concurrency | Version |
|-------|------|-----------------------------------|--------|-------------|---------|
| **Chore** *(default)* | known · none | a branch + a changelog line. **No** `scope.md`/`plan.md`/`progress.yaml`/`deliverables/`. No `WI-NNN/` folder. | Execution only | single worker | patch |
| **Change** | known · local | a light `progress.yaml` + brief plan; branch; one rationale note. | Planning → Execution | optional | minor |
| **Intervention** | known · cross-cutting | the full set: `scope.md` (+`scope-ai.md`), `research.md`/`decisions.md`, `plan.md`, `progress.yaml`, `deliverables/`, Activities/Tasks/`locks/`. | all four | full (parallel agents) | major |
| **Inquiry** | uncertain | handed to research (AAR) as a hypothesis; on conclusion, **re-triage** into one of the above (or close as a lesson). | — | — | — |

**The default class is `chore`.** Triage escalates only when an axis pushes the work up.
Existing AAW work items (the full `WI-NNN/` machinery) are all **interventions** — fully
valid; nothing migrates.

Note the existing AAW lifecycle (Scoping → Discovery → Planning → Execution) is **not**
removed — it *is* the `intervention` path. Lighter classes execute a subset of it.

---

## Triage

Classification is the first move. It answers the three axes, **defaults to the lightest
answer**, and asks the human only when genuinely ambiguous.

```
START
  ├─ Uncertain what to do?            ── yes ─▶ INQUIRY  (→ research; re-triage on conclusion)
  │                                      no
  ├─ Changes observable behaviour/output? ─ no ─▶ CHORE   (enabler/cosmetic/docs)
  │                                      yes
  └─ Reaches beyond one unit (shared / many / all / safety)?
         ├─ no  ─▶ CHANGE
         └─ yes ─▶ INTERVENTION
```

A unit of work is a **chore** unless something forces it higher. "Work items shouldn't be
a big thing": chore is the floor, not the ceiling.

---

## Class vs. substrate (they are orthogonal)

The **class** decides *ceremony*. It does **not** decide *where the work is recorded* —
that is the **substrate**, chosen by a separate routing policy. The same chore can be a
git commit, a task in an external tracker, or nothing at all.

AAW's `WI-NNN/` filesystem workspace is **one substrate among several** — the one
reserved for `intervention`, because that depth (scope, plan, deliverables, multi-agent
locks) is exactly what a lightweight tracker can't hold.

Routing is a function of `(class × tenant)`, where **tenant** is the work context (e.g.
`personal`, a specific employer) declared in `.aaw-config.yaml`. A tenant policy maps each
class to an adapter, with fallbacks for restricted tools. Adapters are pluggable
(external task trackers, ticketing systems, git, the AAW workspace, a research system,
or none). AAW defines the *classes and ceremony*; the host supplies the *adapters and
policy*.

> A chore is **not "untracked"** — it is *tracked by its substrate* (a commit, a tracker
> task, a changelog line), not by an AAW work-item folder. The `WI-NNN/` machinery only
> appears when coordination depth demands it.

---

## Promotion & re-triage

Classification is provisional and cheap to revise:

- **Chore → heavier** — if a chore turns out to be cross-cutting, needs a rationale, or
  needs multi-agent coordination, **promote** it: assign a `WI-NNN`, materialise the
  workspace, attach it to the existing branch. Nothing is lost — the work already exists.
- **Inquiry → intervention/change** — when research concludes "go ahead," the hypothesis
  spawns a typed delivery item; when it concludes "no," it closes as a recorded lesson.

---

## Relationship to the rest of AAW

- **Hierarchy** (Initiative → Work Item → Activity → Task) is unchanged. Class is an
  **orthogonal** attribute that modulates *which* artifacts/phases a Work Item requires.
- **Work types** (`development-work`, `architecture-work`, consultancy) describe the
  *domain of work*; class describes its *ceremony*. They compose: a development item can be
  a chore or an intervention.
- The README's "When to Skip Discovery" decision tree is **subsumed** by triage, with its
  polarity flipped (skip is the default; include is earned).

## Relationship to sibling frameworks

- **AAR (research)** is the home of the `inquiry` class — an inquiry *is* a hypothesis.
  Research concludes, then the work re-triages into a delivery class (or a lesson).
- **AAA (architecture)** receives `decision`-shaped deliverables (ADRs) and cross-cutting
  interventions that touch capabilities/architecture.

---

## Consumer mapping (e.g. an upstream capture/extraction platform)

Hosts that already extract structured items from captured input map their entity
vocabulary onto these classes so the two never drift. Illustrative mapping:

| Host entity | Class | Typical route (by tenant policy) |
|-------------|-------|----------------------------------|
| task · action-item · commitment | **chore / change** | external task tracker |
| idea · insight *(needs investigation)* | **inquiry** | research (AAR) |
| decision | deliverable / ADR | repo / AAA |
| large initiative · cross-cutting change | **intervention** | ticketing system or `WI-NNN/` |

The host owns capture, the extraction pipeline, routing, and adapters; **AAW owns the
class definitions and ceremony rules** the host's classifier applies.

---

## Cross-domain examples (one model, many domains)

The classes are identical across domains; only the examples differ.

| Class | Software / product | Research / writing | Operations / infra | Personal / life admin |
|-------|--------------------|--------------------|--------------------|-----------------------|
| **Chore** | typo, dependency bump | fix a citation | rotate a log file | reply to an email |
| **Change** | add a field to one screen | revise one section | resize one service | reschedule one appointment |
| **Intervention** | change a shared API contract | restructure the thesis | change deployment topology | a multi-step life transition |
| **Inquiry** | "which approach scales?" | "is this hypothesis supported?" | "what's the failure mode?" | "should we relocate?" |

If a domain can answer the three axes for a unit of work, it gets the right ceremony
automatically — no domain-specific rules required.

---

## Summary

- Classify by **certainty × impact × kind** → one of **chore · change · intervention · inquiry**.
- **Ceremony scales with class**; chore is the default floor.
- **Substrate is orthogonal** — chosen by `(class × tenant)` policy, with the `WI-NNN/`
  workspace reserved for interventions.
- **Inquiry** seams to AAR; **decisions/architecture** seam to AAA.
- Promotion and re-triage keep classification cheap and reversible.
