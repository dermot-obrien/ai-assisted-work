// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Local-FS backend: implements @aaw/protocol's Backend interface against
 * the filesystem layout established by AAW v1.
 *
 *   {workItemsPath}/WI-NNN-{slug}/
 *     ├── progress.yaml      # source of truth, optimistic-version-locked
 *     ├── scope.md
 *     ├── plan.md
 *     ├── changelog.log      # JSONL append-only audit
 *     ├── locks/{activityId}.lock   # atomic claim records
 *     └── deliverables/...
 */

import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type Activity,
  type ActivityPatch,
  type Backend,
  type Claim,
  ClaimConflictError,
  type Event,
  type EventScope,
  type Initiative,
  type ListFilters,
  NotHolderError,
  type StateResult,
  type StateScope,
  type Task,
  type TaskPatch,
  VersionConflictError,
  type WorkItem,
} from "@aaw/protocol";
import type { AawConfig } from "../../config.js";
import { parseInitiative, parseWorkItem, serialiseWorkItem } from "./yaml-codec.js";

const WI_FOLDER = /^WI-(\d+)/;
const IN_FOLDER = /^IN-(\d+)/;

export class LocalFsBackend implements Backend {
  constructor(private readonly config: AawConfig) {}

  // === listPoolWork ===

  async listPoolWork(_pool: string, filters?: ListFilters): Promise<WorkItem[]> {
    const items = await this.listWorkItems();
    if (!filters) return items;
    return items.filter((wi) => {
      if (filters.workItemStatus && !filters.workItemStatus.includes(wi.status))
        return false;
      if (filters.initiativeId && wi.initiativeId !== filters.initiativeId)
        return false;
      if (filters.claimableOnly) {
        const hasClaimable = wi.activities.some(
          (a) =>
            a.status === "pending" &&
            a.dependsOn.every(
              (id) =>
                wi.activities.find((x) => x.id === id)?.status === "completed",
            ),
        );
        if (!hasClaimable) return false;
      }
      return true;
    });
  }

  // === claimActivity ===

  async claimActivity(
    activityId: string,
    agentId: string,
    ttlSeconds: number,
  ): Promise<Claim> {
    const wi = await this.findWorkItemContaining(activityId);
    const activity = wi.activities.find((a) => a.id === activityId);
    if (!activity) throw new Error(`Activity ${activityId} not found`);
    const wiPath = await this.resolveWorkItemPath(wi.id);
    const lockPath = path.join(wiPath, "locks", `${activityId}.lock`);

    const now = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1000);
    const newClaim: Claim = {
      activityId,
      holder: agentId,
      holderType: "agent",
      acquired: now.toISOString(),
      expires: expires.toISOString(),
      taskId: null,
      taskAcquired: null,
      taskExpires: null,
    };

    // Inspect existing lock if any.
    const existing = await readJson<Claim>(lockPath);
    if (existing) {
      const existingExpiry = new Date(existing.expires).getTime();
      if (existingExpiry > now.getTime()) {
        throw new ClaimConflictError(activityId, existing.holder);
      }
      // Stale: remove it.
      await unlink(lockPath).catch(() => undefined);
    }

    await mkdir(path.dirname(lockPath), { recursive: true });
    await writeFile(lockPath, JSON.stringify(newClaim, null, 2), { flag: "wx" }).catch(
      (err) => {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          throw new ClaimConflictError(activityId, null);
        }
        throw err;
      },
    );

    // Verify what we wrote is what we hold (defends against the rare
    // simultaneous-create race the .lock file model can't fully prevent).
    const verify = await readJson<Claim>(lockPath);
    if (!verify || verify.holder !== agentId) {
      throw new ClaimConflictError(activityId, verify?.holder ?? null);
    }
    return verify;
  }

  // === updateTask ===

  async updateTask(taskId: string, patch: TaskPatch): Promise<Task> {
    const wi = await this.findWorkItemContaining(taskId);
    if (wi.version !== patch.expectedVersion) {
      throw new VersionConflictError(wi.id, patch.expectedVersion, wi.version);
    }
    const activity = wi.activities.find((a) =>
      a.tasks.some((t) => t.id === taskId),
    );
    if (!activity) throw new Error(`Task ${taskId} not found`);

    const taskIdx = activity.tasks.findIndex((t) => t.id === taskId);
    const t = activity.tasks[taskIdx]!;
    const updated: Task = {
      ...t,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.deliverables !== undefined ? { deliverables: patch.deliverables } : {}),
      ...(patch.completedBy !== undefined ? { completedBy: patch.completedBy } : {}),
      ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
    };
    activity.tasks[taskIdx] = updated;
    await this.writeWorkItem(wi);
    return updated;
  }

  // === updateActivity ===

  async updateActivity(activityId: string, patch: ActivityPatch): Promise<Activity> {
    const wi = await this.findWorkItemContaining(activityId);
    if (wi.version !== patch.expectedVersion) {
      throw new VersionConflictError(wi.id, patch.expectedVersion, wi.version);
    }
    const idx = wi.activities.findIndex((a) => a.id === activityId);
    if (idx < 0) throw new Error(`Activity ${activityId} not found`);
    const a = wi.activities[idx]!;
    wi.activities[idx] = {
      ...a,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.completedBy !== undefined ? { completedBy: patch.completedBy } : {}),
      ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
    };
    await this.writeWorkItem(wi);
    return wi.activities[idx]!;
  }

  // === releaseActivity ===

  async releaseActivity(activityId: string, _reason?: string): Promise<void> {
    const wi = await this.findWorkItemContaining(activityId);
    const activity = wi.activities.find((a) => a.id === activityId);
    if (!activity) throw new Error(`Activity ${activityId} not found`);
    if (activity.status === "in_progress") {
      throw new NotHolderError(
        activityId,
        "must call updateActivity to set terminal state before releaseActivity",
      );
    }
    const wiPath = await this.resolveWorkItemPath(wi.id);
    const lockPath = path.join(wiPath, "locks", `${activityId}.lock`);
    await unlink(lockPath).catch((err) => {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    });
  }

  // === appendEvent ===

  async appendEvent(scope: EventScope, event: Event): Promise<void> {
    const targetPath =
      scope.kind === "workItem"
        ? path.join(await this.resolveWorkItemPath(scope.workItemId), "changelog.log")
        : path.join(await this.resolveInitiativePath(scope.initiativeId), "changelog.log");
    const line = JSON.stringify(event) + "\n";
    const { appendFile } = await import("node:fs/promises");
    await appendFile(targetPath, line, "utf8");
  }

  // === getState ===

  async getState(scope: StateScope): Promise<StateResult> {
    if (scope.kind === "workItem") {
      const wi = await this.loadWorkItem(scope.workItemId);
      return { kind: "workItem", data: wi };
    }
    if (scope.kind === "initiative") {
      const init = await this.loadInitiative(scope.initiativeId);
      return { kind: "initiative", data: init };
    }
    const initiatives = await this.listInitiatives();
    const workItems = await this.listWorkItems();
    return { kind: "tenant", data: { initiatives, workItems } };
  }

  // === Internal helpers ===

  private async listWorkItems(): Promise<WorkItem[]> {
    const entries = await safeReaddir(this.config.workItemsPath);
    const result: WorkItem[] = [];
    for (const entry of entries) {
      if (!WI_FOLDER.test(entry)) continue;
      const dir = path.join(this.config.workItemsPath, entry);
      const yamlPath = path.join(dir, "progress.yaml");
      try {
        const text = await readFile(yamlPath, "utf8");
        result.push(parseWorkItem(text, this.config.tenant));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  private async listInitiatives(): Promise<Initiative[]> {
    const entries = await safeReaddir(this.config.initiativesPath);
    const result: Initiative[] = [];
    for (const entry of entries) {
      if (!IN_FOLDER.test(entry)) continue;
      const dir = path.join(this.config.initiativesPath, entry);
      const yamlPath = path.join(dir, "progress.yaml");
      try {
        const text = await readFile(yamlPath, "utf8");
        result.push(parseInitiative(text, this.config.tenant));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  private async findWorkItemContaining(entityId: string): Promise<WorkItem> {
    const wiId = entityId.match(/^(WI-\d+)/)?.[1];
    if (!wiId) throw new Error(`Cannot derive work item ID from '${entityId}'`);
    return this.loadWorkItem(wiId);
  }

  private async loadWorkItem(workItemId: string): Promise<WorkItem> {
    const dir = await this.resolveWorkItemPath(workItemId);
    const text = await readFile(path.join(dir, "progress.yaml"), "utf8");
    return parseWorkItem(text, this.config.tenant);
  }

  private async loadInitiative(initiativeId: string): Promise<Initiative> {
    const dir = await this.resolveInitiativePath(initiativeId);
    const text = await readFile(path.join(dir, "progress.yaml"), "utf8");
    return parseInitiative(text, this.config.tenant);
  }

  private async resolveWorkItemPath(workItemId: string): Promise<string> {
    const entries = await safeReaddir(this.config.workItemsPath);
    const match = entries.find((e) => e.startsWith(`${workItemId}-`));
    if (!match) throw new Error(`Work item ${workItemId} not found`);
    return path.join(this.config.workItemsPath, match);
  }

  private async resolveInitiativePath(initiativeId: string): Promise<string> {
    const entries = await safeReaddir(this.config.initiativesPath);
    const match = entries.find((e) => e.startsWith(`${initiativeId}-`));
    if (!match) throw new Error(`Initiative ${initiativeId} not found`);
    return path.join(this.config.initiativesPath, match);
  }

  private async writeWorkItem(wi: WorkItem): Promise<void> {
    const dir = await this.resolveWorkItemPath(wi.id);
    const updated: WorkItem = {
      ...wi,
      version: wi.version + 1,
      updated: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    await writeFile(path.join(dir, "progress.yaml"), serialiseWorkItem(updated), "utf8");
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    const all = await readdir(dir, { withFileTypes: true });
    return all.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const text = await readFile(file, "utf8");
    return JSON.parse(text) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

// Suppress TS unused-import warnings on stat (kept for future use).
void stat;