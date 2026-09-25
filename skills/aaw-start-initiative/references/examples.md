# Worked examples

## Research initiative

```
User: "Create an initiative to group all GIFS research work"

Phase 1 (Scoping):
- Goal: Group and track all research work items for the GIFS framework
- Time Horizon: 2025-Q3 – 2026-Q2
- Success Criteria: All research strands tracked; cross-RPM AUROC > 0.99
- Existing WIs: WI-028, WI-030, WI-031

Phase 2 (Creation):
- ID: IN-001
- Location: change/initiatives/IN-001-gifs-research/
- scope.md + progress.yaml created
- WI-028, WI-030, WI-031 linked via initiative_id
```

Note the success criterion. "Cross-RPM AUROC > 0.99" can be checked; "research is progressing"
cannot.

## Platform initiative

```
User: "Start an initiative for the authentication overhaul"

Phase 1 (Scoping):
- Goal: Migrate from session-based to JWT authentication across all services
- Time Horizon: 2026-Q1 – 2026-Q2
- Success Criteria: All services migrated; zero auth-related incidents for one quarter
- Existing WIs: none yet

Phase 2 (Creation):
- ID: IN-002
- Location: change/initiatives/IN-002-auth-overhaul/
- scope.md + progress.yaml created
- No WIs linked yet
```

## Enabler initiative with long-running workstreams

The shape where the two work item levels earn their keep.

```
User: "Set up an initiative for the platform enabler track"

Phase 1 (Scoping):
- Goal: Stand up the shared platform capabilities the delivery teams depend on
- Time Horizon: 2026-Q1 – 2027-Q2
- Success Criteria: Each capability at the agreed maturity rung, evidenced
- Existing WIs: none yet

Phase 2 (Creation):
- ID: IN-003

Then, via /aaw-start-work:
  WI-040 (workstream) Identity and access      — durable, accretes scope
    WI-041 (epic, Q1-FY27) Federation baseline — bounded, one period
    WI-042 (epic, Q2-FY27) Agent identity      — bounded, one period
  WI-043 (workstream) Observability            — durable
    WI-044 (epic, Q1-FY27) Trace collection    — bounded
```

The workstreams never finish; they accrue epics quarter by quarter, and each epic delivers a
capability increment. The epics are what get planned, sized and closed.

## When not to create one

```
User: "Create an initiative to fix the login timeout bug"
```

This is a chore or at most a change, not an initiative. It is bounded, single-unit and has one
product. Say so and route it to `/aaw-start-work`, which will triage it correctly. An
initiative with one member is overhead pretending to be structure.
