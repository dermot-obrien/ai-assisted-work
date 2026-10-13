#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// thread board renew: a lease due within 20 minutes is extended; with nothing due, the command says so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.mjs";

const KEY = "WI-012-A3";

/** When the claim ends, from `locks --json`. */
function leaseUntil(out) {
  const row = JSON.parse(out).find((c) => c.key === KEY);
  assert.ok(row, `${KEY} is claimed`);
  return Date.parse(row.until);
}

test("renew extends a lease that is due within 20 minutes", () => {
  const f = fixture();
  try {
    f.a.run("board", "claim", KEY, "--for", "15m", "--as", "lead");
    const before = leaseUntil(f.a.run("board", "locks", "--json"));
    assert.ok(before - Date.now() < 20 * 60e3);
    assert.match(f.a.run("board", "renew", "--as", "lead"), /renewed 1 lease\(s\) for lead/);
    const after = leaseUntil(f.a.run("board", "locks", "--json"));
    // A claim's lease is an hour, so a renewal reaches well past the old 15 minutes.
    assert.ok(after >= before + 30 * 60e3);
  } finally {
    f.cleanup();
  }
});

test("renew with nothing due says so and leaves the lease", () => {
  const f = fixture();
  try {
    f.a.run("board", "claim", KEY, "--for", "25m", "--as", "lead");
    const before = leaseUntil(f.a.run("board", "locks", "--json"));
    assert.ok(before - Date.now() > 20 * 60e3);
    assert.match(f.a.run("board", "renew", "--as", "lead"), /lead: nothing due for renewal/);
    assert.equal(leaseUntil(f.a.run("board", "locks", "--json")), before);
  } finally {
    f.cleanup();
  }
});
