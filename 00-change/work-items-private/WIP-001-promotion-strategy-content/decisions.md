# Decisions: WIP-001 Promotion Strategy and Content

> Options considered and decisions made before planning.
> Created during the Discovery Phase.

## Decision Summary

| ID | Decision | Chosen Option | Date |
|----|----------|---------------|------|
| D1 | Article topics (4 total) | EA cognitive load + 3 general audience articles | 2026-02-08 |
| D2 | Fourth article focus | Technical general (multi-agent) over second EA article | 2026-02-08 |

---

## D1: Article Topic Selection

### Context

Need to select 3-4 article topics from research findings. User requested:
- 1 EA-focused article on cognitive load (required)
- 2-3 additional articles for EA and general audiences
- Mix of specialized and general content

Research identified strong themes: cognitive load, workflow redesign, multi-agent collaboration, structured vs unstructured AI.

### Options Considered

#### Option A: Balanced Mix (Recommended)
1. EA cognitive load (required)
2. Why AI tools aren't working (general)
3. Busywork to strategy (general)
4. Multi-agent collaboration (technical general)

**Pros:**
- Addresses both EA and general audiences as requested
- Different angles: problem-focused, aspirational, technical
- Leverages all key research findings
- Broadest potential reach

**Cons:**
- Four articles is more work
- Multi-agent article may be too technical for some general readers

**Effort**: High (4 articles)

#### Option B: Minimum Viable Content
1. EA cognitive load (required)
2. Why AI tools aren't working (general)
3. Busywork to strategy (general)

**Pros:**
- Meets minimum requirement (3 articles)
- Covers core value propositions
- Less effort

**Cons:**
- Misses opportunity to showcase technical depth
- No content for technical audience segment

**Effort**: Medium (3 articles)

#### Option C: EA-Heavy Focus
1. EA cognitive load (required)
2. EA complexity management
3. Why AI tools aren't working (general)
4. Busywork to strategy (general)

**Pros:**
- Two EA articles for deeper Enterprise Architect penetration
- Still covers general audience

**Cons:**
- Conflicts with user preference for general articles "unrelated to any profession"
- Less variety in audience targeting

**Effort**: High (4 articles)

### Trade-offs

| Factor | Option A | Option B | Option C |
|--------|----------|----------|----------|
| Audience reach | Broad | Medium | EA-heavy |
| Technical depth | High | Medium | High |
| Effort | High | Medium | High |
| Alignment with scope | Excellent | Good | Partial |

### Decision

**Chosen**: Option A (Balanced Mix)

**Rationale**:
- User specifically mentioned wanting general articles "unrelated to any profession"
- Option A provides best balance: 1 EA-specific + 3 general (varying technical depth)
- Multi-agent collaboration article is timely (IBM: half of enterprise apps by end 2026) and showcases unique value prop
- Different angles (problem → aspiration → technical) appeal to different reader stages
- Research supports all four topics with strong backing

**Decided by**: User approval of agent recommendation

**Date**: 2026-02-08

---

## D2: Fourth Article Focus

### Context

After selecting 3 core articles (EA cognitive load, Why tools fail, Busywork to strategy), need to choose fourth article topic to complete the 3-4 article requirement.

### Options Considered

#### Option D: "How Multiple AI Agents Collaborate Without Chaos"
Technical general audience article.

**Pros:**
- Aligns with user preference for general articles
- Addresses emerging trend (multi-agent AI in 50% of enterprise apps)
- Shows concrete implementation details (locks, progress tracking)
- Differentiates from competitors with technical depth

**Cons:**
- May be too technical for some general readers
- Overlaps slightly with "Busywork to strategy" article's multi-agent theme

**Effort**: High (technical depth required)

#### Article 2: "Managing Architectural Complexity with Multi-Agent Workflows"
Second EA-focused article.

**Pros:**
- Deeper EA audience penetration
- Directly addresses research-backed EA pain point (complexity)
- Strong technical credibility

**Cons:**
- Conflicts with user preference for general articles
- Narrows audience instead of broadening

**Effort**: High (EA-specific depth required)

### Trade-offs

| Factor | Option D | Article 2 |
|--------|----------|-----------|
| Audience | Technical general | EA-specific |
| Scope alignment | Excellent | Partial |
| Topic uniqueness | High | Medium |
| Timeliness | High (2026 trend) | Medium |

### Decision

**Chosen**: Option D - "How Multiple AI Agents Collaborate Without Chaos"

**Rationale**:
- Better aligns with user's stated preference for general articles
- Showcases unique AI-assisted work value prop (concurrency model)
- Addresses timely trend backed by IBM research
- Technical general audience still broader than EA-only
- Different enough from other articles (focuses on coordination layer, not outcomes)

**Decided by**: Agent (based on user's "general articles" preference)

**Date**: 2026-02-08

---

## Final Article Lineup

| # | Article Title | Target Audience | Primary Hook | Length |
|---|--------------|-----------------|--------------|--------|
| 1 | How AI Work Management Reduces Cognitive Load for Enterprise Architects | Enterprise Architects | Research-backed cognitive load challenges | 1,800 words |
| 2 | Why Your AI Productivity Tools Aren't Working (And How to Fix It) | General (frustrated AI users) | 90% use AI but gains require workflow redesign | 1,500 words |
| 3 | From Busywork to Strategy: How Multi-Agent AI Actually Works | General (knowledge workers) | "From doing to discernment" (WEF research) | 1,700 words |
| 4 | How Multiple AI Agents Collaborate Without Chaos | Technical general | Multi-agent AI coming to 50% of apps (IBM) | 1,800 words |

**Total word count**: ~6,800 words across 4 articles

---

## Deferred Decisions

| Decision | Reason Deferred | Decide By |
|----------|-----------------|-----------|
| Include diagrams/screenshots? | Need to draft content first to see where visuals add value | During article drafting |
| Cross-post identical content or adapt per platform? | Medium and LinkedIn have different algorithms; decide after reviewing Medium/LinkedIn specific guidance | During article drafting |
| Academic references in EA article? | Depends on tone after first draft; can add if it strengthens credibility without being dry | During article review |
| Article publishing order? | User will review all drafts together and decide sequencing | Post-drafting phase |
