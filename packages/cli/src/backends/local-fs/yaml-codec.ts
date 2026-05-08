/**
 * Serialise/deserialise WorkItem and Initiative <-> YAML on disk.
 *
 * The on-disk format uses snake_case (legacy AAW convention) while the
 * protocol uses camelCase. This module is the single place that knows
 * about that mapping.
 */

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  Activity,
  Initiative,
  Task,
  WorkItem,
  WorkItemArtifacts,
} from "@aaw/protocol";

interface YamlWorkItem {
  schema_version?: number;
  version: number;
  last_modified: string | null;
  last_modified_by: string | null;
  work_item_id: string;
  title: string;
  type: string;
  status: string;
  initiative_id: string | null;
  created: string;
  updated: string;
  activities: Array<YamlActivity>;
  blockers: Array<unknown>;
  artifacts: Record<string, unknown>;
}

interface YamlActivity {
  id: string;
  title: string;
  status: string;
  actor: string;
  depends_on: string[];
  completed_by: string | null;
  completed_at: string | null;
  tasks: Array<YamlTask>;
}

interface YamlTask {
  id: string;
  title: string;
  status: string;
  actor: string;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  deliverables: string[];
}

export function parseWorkItem(yamlText: string, tenantId: string): WorkItem {
  const y = parseYaml(yamlText) as YamlWorkItem;
  return {
    id: y.work_item_id,
    tenantId,
    title: y.title,
    type: y.type as WorkItem["type"],
    status: y.status as WorkItem["status"],
    initiativeId: y.initiative_id,
    created: y.created,
    updated: y.updated,
    version: y.version,
    lastModified: y.last_modified,
    lastModifiedBy: y.last_modified_by,
    schemaVersion: y.schema_version ?? 1,
    activities: (y.activities ?? []).map(parseActivity),
    blockers: [],
    artifacts: parseArtifacts(y.artifacts ?? {}),
  };
}

function parseActivity(y: YamlActivity): Activity {
  return {
    id: y.id,
    title: y.title,
    status: y.status as Activity["status"],
    actor: (y.actor ?? "any") as Activity["actor"],
    dependsOn: y.depends_on ?? [],
    completedBy: y.completed_by,
    completedAt: y.completed_at,
    tasks: (y.tasks ?? []).map(parseTask),
  };
}

function parseTask(y: YamlTask): Task {
  return {
    id: y.id,
    title: y.title,
    status: y.status as Task["status"],
    actor: (y.actor ?? "any") as Task["actor"],
    completedBy: y.completed_by,
    completedAt: y.completed_at,
    notes: y.notes,
    deliverables: y.deliverables ?? [],
  };
}

function parseArtifacts(raw: Record<string, unknown>): WorkItemArtifacts {
  return {
    scope: (raw.scope as string) ?? "./scope.md",
    plan: (raw.plan as string) ?? "./plan.md",
    scopeAi: (raw.scope_ai as string | null) ?? null,
    changes: (raw.changes as string | null) ?? null,
    research: (raw.research as string | null) ?? null,
    decisions: (raw.decisions as string | null) ?? null,
    notes: (raw.notes as string | null) ?? null,
    jira: (raw.jira as string | null) ?? null,
    branch: (raw.branch as string | null) ?? null,
    pr: (raw.pr as string | null) ?? null,
    diagrams: (raw.diagrams as string[]) ?? [],
    deliverables: (raw.deliverables as WorkItemArtifacts["deliverables"]) ?? [],
  };
}

export function serialiseWorkItem(wi: WorkItem): string {
  const y: YamlWorkItem = {
    schema_version: wi.schemaVersion,
    version: wi.version,
    last_modified: wi.lastModified,
    last_modified_by: wi.lastModifiedBy,
    work_item_id: wi.id,
    title: wi.title,
    type: wi.type,
    status: wi.status,
    initiative_id: wi.initiativeId,
    created: wi.created,
    updated: wi.updated,
    activities: wi.activities.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      actor: a.actor,
      depends_on: a.dependsOn,
      completed_by: a.completedBy,
      completed_at: a.completedAt,
      tasks: a.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        actor: t.actor,
        completed_by: t.completedBy,
        completed_at: t.completedAt,
        notes: t.notes,
        deliverables: t.deliverables,
      })),
    })),
    blockers: wi.blockers,
    artifacts: {
      scope: wi.artifacts.scope,
      plan: wi.artifacts.plan,
      scope_ai: wi.artifacts.scopeAi,
      changes: wi.artifacts.changes,
      research: wi.artifacts.research,
      decisions: wi.artifacts.decisions,
      notes: wi.artifacts.notes,
      jira: wi.artifacts.jira,
      branch: wi.artifacts.branch,
      pr: wi.artifacts.pr,
      diagrams: wi.artifacts.diagrams,
      deliverables: wi.artifacts.deliverables,
    },
  };
  return stringifyYaml(y);
}

export function parseInitiative(yamlText: string, tenantId: string): Initiative {
  const y = parseYaml(yamlText) as Record<string, unknown>;
  return {
    id: y.initiative_id as string,
    tenantId,
    title: y.title as string,
    status: y.status as Initiative["status"],
    owner: (y.owner as string | null) ?? null,
    created: y.created as string,
    updated: y.updated as string,
    targetStart: (y.target_start as string | null) ?? null,
    targetEnd: (y.target_end as string | null) ?? null,
    workItems: (y.work_items as Initiative["workItems"]) ?? [],
    rootWorkItem: (y.root_work_item as string | null) ?? null,
    artifacts: {
      scope: ((y.artifacts as Record<string, unknown>)?.scope as string) ?? "./scope.md",
      notes:
        ((y.artifacts as Record<string, unknown>)?.notes as string | null) ?? null,
    },
    statusNotes: (y.status_notes as string | null) ?? null,
    onHoldReason: (y.on_hold_reason as string | null) ?? null,
    cancelledReason: (y.cancelled_reason as string | null) ?? null,
  };
}
