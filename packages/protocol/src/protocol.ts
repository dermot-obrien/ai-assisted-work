// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * AAW protocol — the six-operation Backend interface that decouples skills
 * (and the CLI) from the storage transport. Implementations:
 *
 *   - LocalFsBackend  — files on disk (this repo, packages/cli)
 *   - CloudBackend    — Cloud Run + Firestore (separate repo, future)
 *   - GitHubBackend   — GitHub Issues/Projects (future, optional)
 *
 * Design rules:
 *   - All operations are async; backends may incur I/O.
 *   - Lock semantics MUST be enforced atomically by the backend. Callers
 *     observe success/failure via thrown errors, never via state inspection.
 *   - Writes that mutate WorkItem state are optimistic-version-checked.
 *     A stale version causes VersionConflictError.
 *   - releaseActivity REQUIRES that updateActivity has already written the
 *     activity's terminal state. Backends MAY reject release if the activity
 *     is still in_progress.
 */

import type {
  Activity,
  ActivityStatus,
  Claim,
  Event,
  Initiative,
  Task,
  TaskStatus,
  WorkItem,
  WorkItemStatus,
} from "./schema.js";

// === Error types ===

/** Atomic claim failed because another worker holds the lock. */
export class ClaimConflictError extends Error {
  constructor(
    public readonly activityId: string,
    public readonly currentHolder: string | null,
  ) {
    super(`Activity ${activityId} is held by ${currentHolder ?? "another worker"}`);
    this.name = "ClaimConflictError";
  }
}

/** Optimistic-version check failed. Re-read and retry. */
export class VersionConflictError extends Error {
  constructor(
    public readonly entityId: string,
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`Version conflict on ${entityId}: expected ${expected}, got ${actual}`);
    this.name = "VersionConflictError";
  }
}

/** Caller does not hold the lock they're attempting to operate under. */
export class NotHolderError extends Error {
  constructor(
    public readonly activityId: string,
    public readonly caller: string,
  ) {
    super(`Caller ${caller} does not hold the claim for ${activityId}`);
    this.name = "NotHolderError";
  }
}

// === Operation parameters ===

export interface ListFilters {
  /** Only return work items with these statuses. */
  workItemStatus?: WorkItemStatus[];
  /** Only return work items containing claimable activities. */
  claimableOnly?: boolean;
  /** Only return work items in this initiative. */
  initiativeId?: string;
}

export interface TaskPatch {
  status?: TaskStatus;
  notes?: string | null;
  deliverables?: string[];
  completedBy?: string | null;
  completedAt?: string | null;
  /** Caller's last-seen version of the parent WorkItem. */
  expectedVersion: number;
}

export interface ActivityPatch {
  status?: ActivityStatus;
  completedBy?: string | null;
  completedAt?: string | null;
  expectedVersion: number;
}

export type EventScope =
  | { kind: "workItem"; workItemId: string }
  | { kind: "initiative"; initiativeId: string };

export type StateScope =
  | { kind: "workItem"; workItemId: string }
  | { kind: "initiative"; initiativeId: string }
  | { kind: "tenant"; tenantId: string };

export type StateResult =
  | { kind: "workItem"; data: WorkItem }
  | { kind: "initiative"; data: Initiative }
  | { kind: "tenant"; data: { initiatives: Initiative[]; workItems: WorkItem[] } };

export type UnsubscribeFn = () => void;

// === The Backend interface ===

export interface Backend {
  /**
   * List work items visible to the caller's pool, optionally filtered.
   * In local-fs mode, "pool" is implicit (the configured workspace);
   * the parameter is reserved for cloud backends.
   */
  listPoolWork(pool: string, filters?: ListFilters): Promise<WorkItem[]>;

  /**
   * Atomically claim an activity. Throws ClaimConflictError if held.
   * Returns the resulting Claim record on success.
   */
  claimActivity(
    activityId: string,
    agentId: string,
    ttlSeconds: number,
  ): Promise<Claim>;

  /**
   * Update a single task. Optimistic-version-checked via patch.expectedVersion.
   * Caller MUST hold the parent activity's lock.
   */
  updateTask(taskId: string, patch: TaskPatch): Promise<Task>;

  /**
   * Update an activity. Optimistic-version-checked via patch.expectedVersion.
   * Caller MUST hold the activity's lock.
   */
  updateActivity(activityId: string, patch: ActivityPatch): Promise<Activity>;

  /**
   * Release an activity claim. The caller MUST have first written the
   * activity's terminal state (status: completed/blocked/skipped) via
   * updateActivity. Backends enforce.
   */
  releaseActivity(activityId: string, reason?: string): Promise<void>;

  /**
   * Append an audit event. Always safe; appends are idempotent at the
   * backend level (duplicates may be collapsed but never lost).
   */
  appendEvent(scope: EventScope, event: Event): Promise<void>;

  /** Read-only state query. */
  getState(scope: StateScope): Promise<StateResult>;

  /**
   * Optional push subscription. Local-fs polls; cloud uses real listeners.
   * Returns an unsubscribe function.
   */
  subscribe?(pool: string, callback: (event: Event) => void): UnsubscribeFn;
}

/** Protocol version. Bumped by the @aaw/protocol package on every release. */
export const PROTOCOL_VERSION = "1.0.0" as const;