# Development Work Type Guide

This document provides specific guidance for work items with `work_type: development`. It ensures consistent deliverables and quality standards for software development work.

---

## Overview

Development work items produce working software that is deployed to production. Unlike architecture work (which produces documentation artifacts), development work follows an environment progression with quality gates at each stage.

**Key Characteristics:**
- Produces deployable code and configuration
- Follows environment progression (Dev → Test → Staging → Prod)
- Quality gates enforce standards at each stage
- Verification through automated tests and deployment success
- Rollback capability required

### Development vs Architecture Work

| Aspect | Architecture Work | Development Work |
|--------|-------------------|------------------|
| **Primary Output** | Documentation artifacts | Working software |
| **Artifacts** | Markdown, diagrams, presentations | Code, tests, configs, deployables |
| **Verification** | Stakeholder review & approval | Automated tests & deployment |
| **Environments** | N/A (docs only) | Dev → Test → Staging → Production |
| **Rollback** | Update/supersede documents | Deployment rollback procedures |
| **Quality Gates** | Review checkpoints | CI/CD pipelines, test coverage |
| **Completion** | Approval obtained | Running in production |

---

## Standard Deliverables

Development work items MUST produce these deliverables:

### Code Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Source Code** | Feature implementation in feature branch |
| **Unit Tests** | Tests for individual components/functions |
| **Integration Tests** | Tests for component interactions |
| **End-to-End Tests** | Tests for complete user workflows (if applicable) |

### Configuration Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Deployment Configuration** | Environment-specific configs, secrets references |
| **Infrastructure as Code** | Terraform, CloudFormation, or equivalent (if applicable) |
| **Pipeline Configuration** | CI/CD pipeline definitions |

### Documentation Deliverables

| Deliverable | Description |
|-------------|-------------|
| **API Documentation** | OpenAPI/Swagger specs (if API changes) |
| **README Updates** | Updated setup/usage instructions |
| **Runbook** | Operational procedures for new functionality |
| **Architecture Notes** | Any architecture changes documented |

---

## Standard Activity Structure

Development work items follow this activity pattern. The structure is sequential because each stage validates the previous one.

### Activity A1: Setup & Environment Preparation

**Depends on:** None

**Outcome:** Development environment ready, branch created, dependencies verified

| Task | Description |
|------|-------------|
| Configure local environment | Install dependencies, configure tools |
| Create feature branch | `wi/WI-NNN-kebab-name` from main |
| Verify dependencies | Check external services, APIs, access |
| Review architecture references | Read relevant ADRs, ABBs, patterns |

### Activity A2: Core Development

**Depends on:** A1

**Outcome:** Feature implemented with unit tests passing locally

| Task | Description |
|------|-------------|
| Implement feature/changes | Write production code |
| Write unit tests | Cover new/changed functionality |
| Run local validation | Verify locally before commit |
| Update inline documentation | Comments, docstrings, type hints |

**Parallelism:** Multiple developers can work on different components within A2 simultaneously.

### Activity A3: Integration & Quality

**Depends on:** A2

**Outcome:** Code passes all quality gates

| Task | Description |
|------|-------------|
| Run integration tests | Verify component interactions |
| Execute code quality checks | Linting, formatting, static analysis |
| Perform security scanning | Dependency vulnerabilities, SAST |
| Verify API contracts | Contract tests (if applicable) |

### Activity A4: Code Review & Merge

**Depends on:** A3

**Outcome:** Code reviewed, approved, and merged to main branch

| Task | Description |
|------|-------------|
| Create pull request | Include description, test evidence |
| Address automated check results | Fix any failing checks |
| Respond to review feedback | Iterate until approved |
| Merge to main branch | After approval, merge and delete branch |

### Activity A5: QA Deployment & Testing

**Depends on:** A4

**Outcome:** QA/Test environment validated

| Task | Description |
|------|-------------|
| Deploy to QA environment | Automated or manual deployment |
| Execute test plan | Functional testing in QA |
| Perform regression testing | Ensure existing functionality intact |
| Log and fix defects | Loop back to A2 if significant issues |

### Activity A6: Staging & UAT

**Depends on:** A5

**Outcome:** Staging validated, stakeholder sign-off obtained

| Task | Description |
|------|-------------|
| Deploy to staging | Mirror of production environment |
| Conduct user acceptance testing | Business stakeholder validation |
| Obtain sign-off | Document approval |
| Submit change request | If CAB/change process required |

### Activity A7: Production Deployment

**Depends on:** A6

**Outcome:** Successfully deployed to production

| Task | Description |
|------|-------------|
| Execute deployment | Follow deployment runbook |
| Run smoke tests | Verify critical paths work |
| Verify monitoring | Confirm alerts and dashboards active |
| Confirm rollback readiness | Ensure rollback is tested/ready |

### Activity A8: Closure & Retrospective

**Depends on:** A7

**Outcome:** Work item closed, lessons captured

| Task | Description |
|------|-------------|
| Monitor production (24-48h) | Watch for issues post-deployment |
| Finalize documentation | Update runbooks, architecture docs |
| Close work item | Update status to `done` |
| Conduct retrospective | Capture lessons learned (if applicable) |

### Dependency Graph

```
A1 (Setup) ──> A2 (Dev) ──> A3 (Quality) ──> A4 (Review) ──> A5 (QA)
                                                              │
                                                              v
                                              A6 (Staging) ──> A7 (Prod) ──> A8 (Close)
```

---

## Environment Progression

Development work follows this standard environment progression:

```
LOCAL ──> DEV/FEATURE ──> TEST/QA ──> STAGING/UAT ──> PRODUCTION
```

### Environment Purposes

| Environment | Purpose | Quality Gate |
|-------------|---------|--------------|
| **Local** | Developer workstation | Unit tests pass |
| **Dev/Feature** | Shared development | Integration tests pass |
| **Test/QA** | Quality assurance | Functional tests pass, QA sign-off |
| **Staging/UAT** | Pre-production validation | UAT sign-off, change approval |
| **Production** | Live system | Smoke tests pass, monitoring green |

### Environment Parity

Staging should mirror production as closely as possible:
- Same infrastructure configuration
- Same deployment process
- Production-like data (anonymized if necessary)
- Same monitoring and alerting

---

## Quality Gates

### Pre-Commit (Local)

- [ ] Code compiles/builds successfully
- [ ] Unit tests pass
- [ ] Linting passes
- [ ] No secrets in code

### Pre-Pull Request

- [ ] All commits are atomic and well-described
- [ ] Branch is up to date with main
- [ ] Integration tests pass
- [ ] Code coverage meets threshold

### Pre-Merge

- [ ] All automated checks pass
- [ ] Code review approved
- [ ] No unresolved review comments
- [ ] Security scan clean

### Pre-Staging

- [ ] QA test plan executed
- [ ] All critical/high defects resolved
- [ ] QA sign-off obtained
- [ ] Performance acceptable

### Pre-Production

- [ ] UAT sign-off obtained
- [ ] Change request approved (if required)
- [ ] Rollback plan documented
- [ ] On-call notified (if applicable)

### Post-Production

- [ ] Smoke tests pass
- [ ] Monitoring shows healthy
- [ ] No increase in errors/alerts
- [ ] 24-48h stability confirmed

---

## CI/CD Integration

Development work items should leverage CI/CD pipelines for automation.

### Pipeline Stages

```
BUILD ──> TEST ──> SCAN ──> DEPLOY-QA ──> DEPLOY-STAGING ──> DEPLOY-PROD
```

### Stage Responsibilities

| Stage | Actions |
|-------|---------|
| **Build** | Compile, package, create artifacts |
| **Test** | Unit tests, integration tests, coverage |
| **Scan** | Security scanning, dependency check |
| **Deploy-QA** | Deploy to QA, run functional tests |
| **Deploy-Staging** | Deploy to staging, enable UAT |
| **Deploy-Prod** | Production deployment, smoke tests |

### Artifact Management

- Build artifacts stored in artifact repository
- Version/tag artifacts with commit SHA or semantic version
- Promote same artifact through environments (don't rebuild)

---

## Rollback Procedures

### When to Rollback

- Critical functionality broken
- Significant performance degradation
- Security vulnerability exposed
- Data corruption risk

### Rollback Decision Tree

```
Is production impacted?
├── YES: Can fix forward quickly (< 15 min)?
│   ├── YES: Fix forward
│   └── NO: Rollback immediately
└── NO: Continue normal triage
```

### Rollback Steps

1. **Decide** - Confirm rollback is necessary
2. **Communicate** - Notify stakeholders
3. **Execute** - Deploy previous version
4. **Verify** - Confirm rollback successful
5. **Investigate** - Root cause analysis
6. **Document** - Record incident and learnings

### Post-Rollback

- Create defect/bug work item for the failed change
- Conduct blameless post-mortem
- Update tests to catch the issue
- Re-attempt deployment after fixes

---

## Verification Checklist

Before marking a development work item complete:

### Code Quality

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage meets threshold
- [ ] No critical/high security vulnerabilities
- [ ] Static analysis clean
- [ ] Code review completed and approved

### Deployment

- [ ] Successfully deployed to production
- [ ] Smoke tests passing
- [ ] Monitoring and alerting configured
- [ ] Rollback verified/ready
- [ ] 24-48h stability confirmed

### Documentation

- [ ] API documentation updated (if applicable)
- [ ] README/setup instructions updated
- [ ] Runbook created/updated
- [ ] Architecture notes documented (if applicable)

### Work Item Closure

- [ ] All acceptance criteria from scope.md met
- [ ] changes.md updated with all files modified
- [ ] progress.yaml marked complete
- [ ] Work item status set to `done`

---

## Handling Defects During Development

### Defect Found in QA (A5)

```
A5 finds defect
├── Minor defect: Log, continue testing, fix in follow-up
└── Critical defect:
    ├── Loop back to A2 (Development)
    ├── Fix and re-test
    └── Resume from A3 (Quality)
```

### Defect Found in Staging/UAT (A6)

```
A6 finds defect
├── Minor defect: Document, get stakeholder decision
└── Critical defect:
    ├── Block deployment
    ├── Loop back to A2 (Development)
    └── Full regression through A3-A5 before returning to A6
```

### Defect Found in Production (A7/A8)

```
Production defect
├── Critical: Rollback immediately, create incident
└── Non-critical:
    ├── Create defect work item
    └── Prioritize for next deployment
```

---

## Reference: Work Item Templates

When a reference development work item is completed, link it here as a template.

| Reference | Work Item | Description |
|-----------|-----------|-------------|
| API Feature | (TBD) | Template for API development |
| UI Feature | (TBD) | Template for frontend development |
| Infrastructure | (TBD) | Template for IaC changes |

---

**Last Updated**: 2026-01-25
