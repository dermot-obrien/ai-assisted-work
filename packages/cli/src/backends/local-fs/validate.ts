// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Runtime validation for parsed WorkItem and Initiative records.
 *
 * The TypeScript types in @aaw/protocol are erased at runtime, so YAML on
 * disk could contain arbitrary strings where we expect enum values. Bad
 * data flows through to status/lint/etc as silent corruption otherwise.
 *
 * This module checks each record against the protocol's enum definitions
 * and returns an array of {path, message} issues — empty if the record
 * is valid. Callers decide what to do with issues (lint reports them;
 * status logs to stderr and continues).
 */

import type {
  Activity,
  ActivityStatus,
  Actor,
  Initiative,
  InitiativeStatus,
  Task,
  TaskStatus,
  WorkItem,
  WorkItemStatus,
  WorkType,
} from "@aaw/protocol";

const WORK_ITEM_STATUSES: readonly WorkItemStatus[] = [
  "scoping",
  "discovery",
  "planning",
  "in_progress",
  "blocked",
  "review",
  "abandoned",
  "done",
];

const ACTIVITY_STATUSES: readonly ActivityStatus[] = [
  "pending",
  "in_progress",
  "awaiting_human",
  "completed",
  "blocked",
  "skipped",
  "abandoned",
];

const TASK_STATUSES: readonly TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "skipped",
  "awaiting_human",
  "abandoned",
];

const INITIATIVE_STATUSES: readonly InitiativeStatus[] = [
  "proposed",
  "active",
  "on_hold",
  "completed",
  "done",
  "cancelled",
];

const ACTORS: readonly Actor[] = ["agent", "human", "any"];

const WORK_TYPES: readonly WorkType[] = [
  "development",
  "architecture",
  "consultancy",
  "mixed",
];

export interface Issue {
  path: string;
  message: string;
}

export function validateWorkItem(wi: WorkItem): Issue[] {
  const issues: Issue[] = [];

  if (!isOneOf(wi.status, WORK_ITEM_STATUSES)) {
    issues.push({
      path: `${wi.id}.status`,
      message: `invalid WorkItemStatus '${wi.status}' (expected one of: ${WORK_ITEM_STATUSES.join(", ")})`,
    });
  }
  if (!isOneOf(wi.type, WORK_TYPES)) {
    issues.push({
      path: `${wi.id}.type`,
      message: `invalid WorkType '${wi.type}' (expected one of: ${WORK_TYPES.join(", ")})`,
    });
  }

  for (const a of wi.activities) {
    issues.push(...validateActivity(wi.id, a));
  }

  return issues;
}

function validateActivity(workItemId: string, a: Activity): Issue[] {
  const issues: Issue[] = [];
  const prefix = `${workItemId}/${a.id}`;

  if (!isOneOf(a.status, ACTIVITY_STATUSES)) {
    issues.push({
      path: `${prefix}.status`,
      message: `invalid ActivityStatus '${a.status}' (expected one of: ${ACTIVITY_STATUSES.join(", ")})`,
    });
  }
  if (!isOneOf(a.actor, ACTORS)) {
    issues.push({
      path: `${prefix}.actor`,
      message: `invalid Actor '${a.actor}' (expected one of: ${ACTORS.join(", ")})`,
    });
  }
  for (const t of a.tasks) {
    issues.push(...validateTask(prefix, t));
  }
  return issues;
}

function validateTask(activityPath: string, t: Task): Issue[] {
  const issues: Issue[] = [];
  const prefix = `${activityPath}/${t.id}`;

  if (!isOneOf(t.status, TASK_STATUSES)) {
    issues.push({
      path: `${prefix}.status`,
      message: `invalid TaskStatus '${t.status}' (expected one of: ${TASK_STATUSES.join(", ")})`,
    });
  }
  if (!isOneOf(t.actor, ACTORS)) {
    issues.push({
      path: `${prefix}.actor`,
      message: `invalid Actor '${t.actor}' (expected one of: ${ACTORS.join(", ")})`,
    });
  }
  return issues;
}

export function validateInitiative(init: Initiative): Issue[] {
  const issues: Issue[] = [];
  if (!isOneOf(init.status, INITIATIVE_STATUSES)) {
    issues.push({
      path: `${init.id}.status`,
      message: `invalid InitiativeStatus '${init.status}' (expected one of: ${INITIATIVE_STATUSES.join(", ")})`,
    });
  }
  return issues;
}

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}
