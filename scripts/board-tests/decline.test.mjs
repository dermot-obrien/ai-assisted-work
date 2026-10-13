#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// thread board decline: declining an open call you took lets it go, so another agent can claim it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, postId } from "./fixture.mjs";

test("declining an open call you took releases it, so another agent can claim it", () => {
  const f = fixture();
  try {
    const id = postId(f.human.run("board", "post", "Fix the flaky test", "--to", "any", "--kind", "instruction", "--as", "dermot"));
    assert.match(f.a.run("board", "claim", id, "--as", "a1"), /a1 holds/);
    assert.equal(f.b.raw("board", "claim", id, "--as", "b1").status, 2);
    assert.match(f.a.run("board", "decline", id, "not my area", "--as", "a1"), new RegExp(`${id} declined: not my area`));
    assert.match(f.b.run("board", "claim", id, "--as", "b1"), /b1 holds/);
  } finally {
    f.cleanup();
  }
});

test("a decline with no reason is refused and keeps the claim", () => {
  const f = fixture();
  try {
    const id = postId(f.human.run("board", "post", "Fix the flaky test", "--to", "any", "--kind", "instruction", "--as", "dermot"));
    f.a.run("board", "claim", id, "--as", "a1");
    const r = f.a.raw("board", "decline", id, "--as", "a1");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /say what happened/);
    assert.equal(f.b.raw("board", "claim", id, "--as", "b1").status, 2);
  } finally {
    f.cleanup();
  }
});
