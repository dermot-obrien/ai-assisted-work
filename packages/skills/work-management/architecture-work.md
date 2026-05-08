# Architecture Work Type Guide

This document provides specific guidance for work items with `work_type: architecture`. It ensures consistent deliverables and quality standards for architecture work.

> **Note**: This guide provides templates and standards for architecture work items.

---

## Overview

Architecture work items produce enterprise architecture artifacts that enable stakeholder approval and guide implementation. They focus on the **WHAT** (capabilities, ABBs) and **WHY** (decisions, business case) rather than the **HOW** (implementation details, SBBs).

**Key Characteristics:**
- Vendor-agnostic at the conceptual level
- Business capability-driven organization
- Suitable for executive/stakeholder communication
- Traceable to implementation through ADRs and roadmaps

---

## Standard Deliverables

Architecture work items MUST produce these deliverables (unless explicitly scoped out):

### Core Architecture Deliverables

| Deliverable | Location | Description |
|-------------|----------|-------------|
| **Capability Definition** | `02-capabilities/{domain}/` | Business capabilities with maturity levels, BIAN alignment |
| **ABB Specification** | `03-building-blocks/architecture-building-blocks/abbs/` | Logical components, functional requirements, quality attributes |
| **Operating Model** | `02-capabilities/{domain}/` | Team structures, RACI, governance, SLAs |
| **Architecture Decision Records** | `05-governance/decisions/` | Key decisions with options analysis |
| **Implementation Roadmap** | `00-change/roadmap/{domain}/` | Phased plan with milestones and dependencies |

### Business Case Deliverables

| Deliverable | Location | Description |
|-------------|----------|-------------|
| **Cost-Benefit Model** | `02-capabilities/{domain}/` | Investment costs, benefits, ROI analysis |
| **Executive Presentation** | `02-capabilities/{domain}/` | Stakeholder deck with business case |

### Visual Deliverables

| Deliverable | Location | Description |
|-------------|----------|-------------|
| **Conceptual Architecture Diagram** | `02-capabilities/{domain}/diagrams/` | Layered ABBs organized by capability (Draw.io) |
| **Context & Integration Diagram** | `02-capabilities/{domain}/diagrams/` | Ecosystem relationships (Draw.io) |
| **Diagram Guide** | `02-capabilities/{domain}/diagrams/` | Documentation for diagram usage |

---

## Standard Activity Structure

Architecture work items follow this activity pattern. Adapt based on scope.

### Phase 1: Foundation (Parallel)

These activities have no dependencies and can run concurrently:

```
A1: Capability Validation & Refinement
    - Review existing capabilities against best practices
    - Validate maturity levels
    - Map to BIAN service domains
    - Document current state
    - Update capability definitions

A2: ABB Formalization & Technology Alignment
    - Finalize ABB specifications (move to Approved status)
    - Define SBB references (without implementation details)
    - Document technology alignment options
    - Validate pattern alignment

A3: Operating Model Definition
    - Define team structures (Platform, Enabling, Domain)
    - Create RACI matrix
    - Define key roles and responsibilities
    - Document governance procedures and SLAs
```

### Phase 2: Documentation (Depends on Phase 1)

```
A4: Architecture Decision Records
    Depends on: A1, A2, A3
    - Create ADRs for key decisions
    - Follow governance template
    - Include options analysis
    - Document consequences

A5: Implementation Roadmap
    Depends on: A1, A2, A3
    - Define implementation phases
    - Map activities with dependencies
    - Define milestones and success criteria
    - Document pilot approach
```

### Phase 3: Business Case (Can run parallel with Phase 1)

```
A6: Cost-Benefit Model
    Depends on: None (can run in parallel)
    - Define cost model structure
    - Document benefit categories
    - Define KPIs and measurement approach
    - Create ROI methodology
    - Include industry benchmarks
```

### Phase 4: Synthesis (Depends on Phases 2 & 3)

```
A7: Executive Presentation
    Depends on: A4, A5, A6
    - Create deck structure and narrative
    - Develop executive summary slides
    - Create architecture visualization
    - Develop business case slides
    - Create roadmap summary
    - Develop technical appendix

A8: Conceptual Architecture Diagrams
    Depends on: A2, A7 (can be pulled earlier if needed)
    - Create layered conceptual architecture diagram
    - Create context/integration diagram
    - Create diagram guide documentation
```

### Dependency Graph

```
A1 (Capabilities) ──┬──> A4 (ADRs) ─────────┐
                    │                       │
A2 (ABBs)       ────┼──> A5 (Roadmap) ──────┼──> A7 (Exec Deck)
                    │                       │        │
A3 (Operating) ─────┘                       │        v
                                            │     A8 (Diagrams)
A6 (Cost-Benefit) ──────────────────────────┘
```

---

## Diagram Standards

Architecture work items produce **conceptual architecture diagrams** (not solution diagrams):

### Conceptual vs Solution Diagrams

| Aspect | Conceptual (ABB-level) | Solution (SBB-level) |
|--------|------------------------|----------------------|
| **Purpose** | What the system does | How it's implemented |
| **Components** | Architecture Building Blocks | Solution Building Blocks |
| **Audience** | Executives, stakeholders | Implementers, developers |
| **Notation** | Capability layers, ABBs | C4, deployment diagrams |
| **Stability** | Stable (changes rarely) | Evolves with technology |
| **Vendor** | Vendor-agnostic | Vendor-specific |

### Conceptual Architecture Diagram Requirements

**Structure: Layered by Business Capability**

Organize ABBs by the capability layers they support:

```
┌─────────────────────────────────────────────────────────────┐
│  CONSUMERS (External)                                       │
│  Business units, applications, users that consume           │
├─────────────────────────────────────────────────────────────┤
│  ACCESS & DELIVERY LAYER (Top)                              │
│  ABBs for consumption: API Gateway, Orchestrators, Search   │
├─────────────────────────────────────────────────────────────┤
│  ORGANIZATION & MODELING LAYER                              │
│  ABBs for structure: Graph Engine, Ontology, Taxonomy       │
├─────────────────────────────────────────────────────────────┤
│  STORAGE & RETRIEVAL LAYER                                  │
│  ABBs for persistence: Vector Store, Graph Store, Document  │
├─────────────────────────────────────────────────────────────┤
│  CAPTURE & INGESTION LAYER (Bottom)                         │
│  ABBs for input: Document Processor, Embeddings, Quality    │
└─────────────────────────────────────────────────────────────┘
```

**Required Elements:**

1. **Capability layers** with color coding (see color scheme below)
2. **ABBs as components** within each layer
3. **Consumer panel** showing who uses the capability
4. **Domain products panel** showing federated ownership (if applicable)
5. **Governance panel** showing cross-cutting concerns
6. **Key metrics panel** with target architecture metrics
7. **ADR references panel** linking to decision records

**Color Scheme (Enterprise Visual Standards):**

| Layer/Element | Color | Hex Code |
|---------------|-------|----------|
| Access/Delivery | Navy Blue | #003087 / #E6F0FF (bg) |
| Organization | Teal | #00A651 / #E6F7ED (bg) |
| Storage | Purple | #9C27B0 / #F3E5F5 (bg) |
| Ingestion | Orange | #FF6B35 / #FFE6D9 (bg) |
| Governance | Amber | #FFA000 / #FFF3E0 (bg) |
| External | Gray | #666666 |
| Pilot domains | Light Blue | #50E6FF |

### Context & Integration Diagram Requirements

Shows ecosystem relationships:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ SOURCES         │────>│ CAPABILITY      │────>│ CONSUMERS       │
│ (Left)          │     │ (Center)        │     │ (Right)         │
│ • Internal      │     │                 │     │ • Applications  │
│ • External      │     │ Layer view      │     │ • Users         │
│ • SME input     │     │                 │     │ • Agents        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      ↑↓                      │
         │              ┌───────────────┐               │
         └─────────────>│ PLATFORM      │<──────────────┘
                        │ SERVICES      │
                        └───────────────┘
```

**Required Panels:**
- Sources (left) - where data/input comes from
- Capability (center) - simplified layer view
- Consumers (right) - who uses the output
- Platform Services (bottom) - shared infrastructure
- Operating Model (side) - team structure

### Diagram File Standards

**Format:** Draw.io XML (`.drawio`)

**Naming Convention:** `{ID}-{Name}-v{Major}.{Minor}.{Patch}.drawio`
- Example: `DA-001-Conceptual-Architecture-v1.0.0.drawio`

**Companion Guide:** Create `{domain}-diagram-guide.md` documenting:
- Diagram inventory and purpose
- ABB-to-capability mapping
- Color scheme explanation
- Presentation usage guidance

---

## ADR Requirements

Architecture work items typically produce 3-7 ADRs for key decisions.

### Common ADR Categories

| Category | Example Decision |
|----------|------------------|
| **Architecture Pattern** | RAG pattern selection (Self-Reflective, Graph, Hybrid) |
| **Technology Strategy** | Database selection, cloud services |
| **Federated Approach** | Ownership model, domain boundaries |
| **Operating Model** | Team structure, governance |
| **Standards** | Ontology, taxonomy, classification approach |

### ADR Template Requirements

Each ADR MUST include:
1. **Context** - Why this decision is needed
2. **Options Considered** - At least 3 options with pros/cons
3. **Decision** - Clear statement of chosen option
4. **Consequences** - Positive and negative impacts
5. **Compliance** - How this aligns with standards/governance

---

## Operating Model Requirements

Operating model documentation MUST include:

### Team Structure

| Team Type | Responsibility |
|-----------|----------------|
| **Platform Team** | Core capability operations and development |
| **Enabling Team** | Domain support, knowledge engineering |
| **Domain Teams** | Domain-specific knowledge products |

### Required Sections

1. **Team Definitions** - Composition, skills, sizing
2. **RACI Matrix** - Responsibilities across teams
3. **Governance Procedures** - Decision-making, escalation
4. **SLA Framework** - Availability, response time, quality targets
5. **Operational Procedures** - Key workflows, incident management
6. **Tooling** - Systems used for operations

---

## Business Case Requirements

### Cost Model Structure

| Category | Include |
|----------|---------|
| **Infrastructure** | Cloud services, storage, compute |
| **Licensing** | Software licenses, subscriptions |
| **People** | FTEs by role, contractors |
| **Operations** | Ongoing costs, support |

### Benefits Framework

Document benefits with:
- Benefit category (productivity, risk reduction, revenue)
- Measurement approach (KPI, baseline, target)
- Industry benchmarks for validation
- Specific use case examples

### ROI Analysis

Include:
- Investment timeline (by phase)
- Benefit realization timeline
- NPV, IRR, payback period calculations
- Sensitivity analysis for key assumptions

---

## Executive Presentation Requirements

### Standard Deck Structure

| Section | Slides | Content |
|---------|--------|---------|
| **Executive Summary** | 2-3 | Investment ask, key benefits, timeline |
| **Business Case** | 3-4 | Problem, opportunity, ROI |
| **Architecture Overview** | 3-4 | Capabilities, ABBs (use diagrams) |
| **Implementation Approach** | 2-3 | Phases, milestones, risks |
| **Investment & Resources** | 2 | Costs, team, timeline |
| **Recommendation** | 1 | Clear ask and next steps |
| **Appendix** | 5+ | Details, ADR references, benchmarks |

### Format

- Markdown format with ASCII diagrams (for version control)
- Reference Draw.io diagrams for visual presentations
- Include speaker notes for key slides

---

## Verification Checklist

Before marking an architecture work item complete:

### Deliverables Verification

- [ ] Capability definitions updated with maturity levels
- [ ] ABB specification finalized (Approved status)
- [ ] Operating model documented with RACI
- [ ] All required ADRs created and approved
- [ ] Implementation roadmap with phases and milestones
- [ ] Cost-benefit model with ROI analysis
- [ ] Executive presentation deck complete
- [ ] Conceptual architecture diagram created
- [ ] Context/integration diagram created
- [ ] Diagram guide documentation created

### Quality Verification

- [ ] Visual design standards followed (colors, fonts, layouts)
- [ ] Traceability maintained (capabilities → ABBs → ADRs)
- [ ] BIAN/industry alignment documented
- [ ] All acceptance criteria from scope.md met
- [ ] changes.md updated with all files modified/created

### Stakeholder Readiness

- [ ] Ready for Enterprise Architecture Forum review
- [ ] Ready for business stakeholder presentation
- [ ] Technical appendix suitable for implementation teams

---

## Reference: Example Deliverable Structure

The following shows the standard deliverable structure for architecture work items:

| Deliverable | Standard Location Pattern |
|-------------|---------------------------|
| Capability Definition | `02-capabilities/{domain}/{domain}-capabilities.md` |
| ABB Specification | `03-building-blocks/architecture-building-blocks/abbs/{ABB-ID}/index.md` |
| Operating Model | `02-capabilities/{domain}/{domain}-operating-model.md` |
| Cost-Benefit Model | `02-capabilities/{domain}/{domain}-cost-benefit-model.md` |
| ADR Example | `05-governance/decisions/ADR-{NNN}-{decision-title}.md` |
| Roadmap | `00-change/roadmap/{domain}/implementation-roadmap.md` |
| Executive Deck | `02-capabilities/{domain}/{domain}-executive-presentation.md` |
| Conceptual Diagram | `02-capabilities/{domain}/diagrams/{ID}-Conceptual-Architecture-v{X.Y.Z}.drawio` |
| Context Diagram | `02-capabilities/{domain}/diagrams/{ID}-Context-Integration-v{X.Y.Z}.drawio` |
| Diagram Guide | `02-capabilities/{domain}/diagrams/{domain}-diagram-guide.md` |

---

## When NOT to Use This Guide

This guide applies to **enterprise architecture** work items. It does NOT apply to:

- **Solution architecture** - Use C4 diagrams, SBB specifications
- **Development work** - Code implementation, testing
- **Consultancy work** - Research, recommendations without architecture artifacts
- **Simple enhancements** - Minor updates to existing documentation

For solution-level architecture within an implementation, create SBB specifications and C4 diagrams rather than ABB-level conceptual diagrams.

---

**Last Updated**: 2026-01-25
