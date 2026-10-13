#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// thread board release: another agent's claim needs --take before it can be freed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.mjs";

test("releasing another agent's claim requires --take and makes it available", () => {
  const f = fixture();
  try {
    const key = "WI-012-A3";
    f.a.run("board", "claim", key, "--as", "lead");
    const denied = f.b.raw("board", "release", key, "--as", "worker");
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr + denied.stdout, new RegExp(`${key} is held by lead`));
    assert.match(f.b.run("board", "locks", "--as", "worker"), new RegExp(`${key} · lead`));

    assert.match(f.b.run("board", "release", key, "--take", "--as", "worker"), new RegExp(`${key} released`));
    assert.match(f.b.run("board", "locks", "--as", "worker"), /Nothing is claimed/);
    f.human.run("board", "claim", key, "--as", "next");
    assert.match(f.a.run("board", "locks", "--as", "lead"), new RegExp(`${key} · next`));
  } finally {
    f.cleanup();
  }
});
