# About AI-Assisted Work

Background, vision, and design decisions for the project.

## Overview

AI-Assisted Work provides domain-agnostic AI agents for work management and productivity tasks. This project is designed to be:

- **Reusable** across any domain or project type
- **Installable** skill by skill into any repository, with `bin/skills.mjs`
- **Customizable** for organizational needs
- **Community-driven** with contributions welcome

## Contents

- [Vision](vision.md) - Why this project exists and where it's going
- [Design Decisions](design-decisions.md) - Key decisions and rationale
- [Organization Adoption](organization-adoption.md) - How organizations can adopt and customize
- [Roadmap](roadmap.md) - Development plans

## Relationship to Domain-Specific Projects

AI-Assisted Work holds the domain-agnostic work model. Domain-specific bundles of skills, such as AI-Assisted Architecture and AI-Assisted Research, build on that model (the work ontology) but do not depend on AI-Assisted Work being installed: each installs on its own with the same installer.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         Domain-Specific Repositories                           │
│                                                                                │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐              │
│   │  AI-Assisted    │   │  AI-Assisted    │   │  AI-Assisted    │              │
│   │  Architecture   │   │  Development    │   │  Research       │              │
│   │                 │   │                 │   │                 │              │
│   │  Domain-specific│   │  Domain-specific│   │  Domain-specific│              │
│   │  methodology    │   │  methodology    │   │  methodology    │              │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘              │
│            │                     │                     │                       │
│            └─────────────────────┴─────────────────────┘                       │
│                                  │                                             │
│                                  ▼                                             │
│   ┌──────────────────────────────────────────────────────────────────────────┐ │
│   │                        AI-Assisted Work                                  │ │
│   │                                                                          │ │
│   │   work skill and installer  │  Common Templates  │  Work ontology        │ │
│   │                                                                          │ │
│   │   (Domain-agnostic work model; each skill installs on its own)           │ │
│   └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```
