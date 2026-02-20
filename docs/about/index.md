# About AI-Assisted Work

Background, vision, and design decisions for the project.

## Overview

AI-Assisted Work provides domain-agnostic AI agents for work management and productivity tasks. This project is designed to be:

- **Reusable** across any domain or project type
- **Embeddable** as a submodule in domain-specific repositories
- **Customizable** for organizational needs
- **Community-driven** with contributions welcome

## Contents

- [Vision](vision.md) - Why this project exists and where it's going
- [Design Decisions](design-decisions.md) - Key decisions and rationale
- [Organization Adoption](organization-adoption.md) - How organizations can adopt and customize
- [Roadmap](roadmap.md) - Development plans

## Relationship to Domain-Specific Projects

AI-Assisted Work is designed as a **foundation layer**:

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
│   │   Work Management Agents  │  Common Templates                           │ │
│   │                                                                          │ │
│   │   (Domain-agnostic foundation - included as submodule)                   │ │
│   └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```
