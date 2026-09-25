---
title: Order Capture
version: "0.1"
---

# Order Capture

A worked example. Boxes and lines, no architecture vocabulary required.

## Components

| Component | Zone | Role |
|---|---|---|
| SVC-01 Order API | edge | Accepts and validates orders |
| SVC-02 Pricing | core | Prices a basket |
| SVC-03 Ledger | core | Records the committed order |
| EXT-01 Payments | external | Third-party payment provider |

## Interfaces

| Interface | Provider | Consumer | Purpose |
|---|---|---|---|
| IF-01 | SVC-01 | SVC-02 | price a basket |
| IF-02 | SVC-01 | EXT-01 | authorise payment |
| IF-03 | SVC-01 | SVC-03 | commit the order |

## Scenarios

### S1 Happy path

| Step | Actor | Target | Action | Interface |
|---|---|---|---|---|
| 1 | SVC-01 | SVC-02 | price the basket | IF-01 |
| 2 | SVC-01 | EXT-01 | authorise payment | IF-02 |
| 3 | SVC-01 | SVC-03 | commit the order | IF-03 |
