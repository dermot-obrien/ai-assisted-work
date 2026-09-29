// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * AAW schema — entity types for tenant, pool, initiative, work item,
 * activity, task, deliverable, claim, blocker, event.
 *
 * Pure data shapes. No methods, no I/O. Backends serialise these to/from
 * their preferred wire format (YAML on disk, JSON over HTTP, etc.).
 *
 * The work layer's source of truth is schemas/work.schema.json (DD-11). These
 * types are its camelCase projection: scripts/check-protocol-schema.mjs fails CI
 * when an enum or an entity's fields here disagree with it. Tenant, Pool, Claim
 * and Event are protocol runtime types with no on-disk counterpart.
 */

// === Status enums ===

export type WorkItemStatus =
  | "scoping"
  | "discovery"
  | "planning"
  | "in_progress"
  | "blocked"
  | "review"
  | "abandoned"
  | "done";

export type ActivityStatus =
  | "pending"
  | "in_progress"
  | "awaiting_human"
  | "completed"
  | "blocked"
  | "skipped"
  | "abandoned";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped"
  | "awaiting_human"
  | "abandoned";

export type InitiativeStatus =
  | "proposed"
  | "active"
  | "on_hold"
  | "completed"
  | "done"
  | "cancelled";

/** The state of a product named in a work item's deliverables (schema version 3). */
export type DeliverableState = "planned" | "drafted" | "in_review" | "accepted";

/** The status of a schema version 1 or 2 deliverable under artifacts.deliverables. */
export type DeliverableStatus = "pending" | "draft" | "complete";

export type Actor = "agent" | "human" | "any";

/** The work types AAW has always accepted. */
export type CoreWorkType = "development" | "architecture" | "consultancy" | "mixed";

/**
 * Open (DD-11): a core value, a value a higher layer contributes as
 * `<prefix>:<value>`, or a workspace's own as `x-<value>`.
 */
export type WorkType = CoreWorkType | `${string}:${string}` | `x-${string}`;

export type WorkItemLevel = "workstream" | "epic";

export type FileChangeAction = "created" | "modified" | "deleted";

export type WorkerType = "agent" | "human" | "system";

// === Tenancy ===

export interface Tenant {
  id: string;
  name: string;
}

export interface Pool {
  id: string;
  tenantId: string;
  slotBudget: number;
  inFlight: number;
}

// === Initiative ===

export interface Initiative {
  id: string; // IN-NNN
  tenantId: string;
  title: string;
  status: InitiativeStatus;
  owner: string | null;
  created: string; // ISO-8601
  updated: string; // ISO-8601
  targetStart: string | null; // e.g., "2026-Q1"
  targetEnd: string | null;
  workItems: WorkItemRef[];
  rootWorkItem: string | null;
  artifacts: InitiativeArtifacts;
  statusNotes: string | null;
  onHoldReason: string | null;
  cancelledReason: string | null;
}

export interface WorkItemRef {
  id: string;
  title: string;
  status: WorkItemStatus;
  path: string;
}

export interface InitiativeArtifacts {
  scope: string;
  notes: string | null;
}

// === Work Item ===

export interface WorkItem {
  id: string; // WI-NNN
  tenantId: string;
  title: string;
  type: WorkType;
  status: WorkItemStatus;
  initiativeId: string | null;
  created: string;
  updated: string;
  /** Optimistic-lock version. Increments on every write. */
  version: number;
  lastModified: string | null;
  lastModifiedBy: string | null;
  schemaVersion: number;
  /** Schema version 3 on. */
  workItemLevel?: WorkItemLevel;
  parentWorkItemId?: string | null;
  planningPeriod?: string | null;
  advancesKrIds?: string[];
  /** The products this work item will produce (schema version 3). */
  deliverables?: Deliverable[];
  activities: Activity[];
  blockers: Blocker[];
  artifacts: WorkItemArtifacts;
}

export interface Activity {
  id: string; // {WI}-A{N}
  title: string;
  /** The deliverable this activity contributes to. Required from schema version 3. */
  produces?: string | null;
  status: ActivityStatus;
  actor: Actor;
  dependsOn: string[];
  completedBy: string | null;
  completedAt: string | null;
  tasks: Task[];
}

export interface Task {
  id: string; // {A}-T{N}
  title: string;
  status: TaskStatus;
  actor: Actor;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
  /** Deliverable IDs this task contributes to. */
  deliverables: string[];
}

export interface Blocker {
  id: string; // {WI}-B{N}
  activityId: string;
  taskId: string | null;
  description: string;
  raisedAt: string;
  raisedBy: string;
  resolvedAt: string | null;
  resolution: string | null;
}

export interface WorkItemArtifacts {
  scope: string;
  plan: string;
  scopeAi: string | null;
  changes: string | null;
  research: string | null;
  decisions: string | null;
  notes: string | null;
  jira: string | null;
  branch: string | null;
  pr: string | null;
  diagrams: string[];
  /** Schema versions 1 and 2 only; version 3 uses WorkItem.deliverables. */
  deliverables: ArtifactDeliverable[];
}

/** A product a work item leaves behind (schema version 3). */
export interface Deliverable {
  id: string; // {WI}-D{N}
  /** A type id from the workspace's deliverables register, if one is configured. */
  type: string | null;
  name: string;
  whyNeeded: string | null;
  dependsOn: string[];
  qualityCriteria: string | null;
  approver: string | null;
  state: DeliverableState;
  owner: string | null;
  path: string | null;
  filesChanged: FileChange[];
}

/** A deliverable as schema versions 1 and 2 recorded it, under artifacts. */
export interface ArtifactDeliverable {
  id: string; // {WI}-D{NN}
  title: string;
  path: string;
  activity: string;
  status: DeliverableStatus;
  filesChanged: FileChange[];
}

export interface FileChange {
  path: string;
  action: FileChangeAction;
}

// === Concurrency ===

export interface Claim {
  activityId: string;
  holder: string;
  holderType: WorkerType;
  acquired: string;
  expires: string;
  taskId: string | null;
  taskAcquired: string | null;
  taskExpires: string | null;
}

// === Audit ===

export interface Event {
  timestamp: string;
  worker: string;
  workerType: WorkerType;
  action: string;
  activityId?: string;
  taskId?: string;
  details?: string;
  deliverable?: string;
}