#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// thread board retract: a withdrawn post leaves the inboxes it was in, and the sender sees it withdrawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, postId } from "./fixture.mjs";

test("a retracted instruction leaves its recipient's inbox and shows as retracted", () => {
  const f = fixture();
  try {
    f.b.run("board", "start", "--as", "worker");
    const id = postId(f.a.run("board", "post", "Rename the module", "--to", "worker", "--kind", "instruction", "--as", "lead"));
    assert.match(f.b.run("board", "inbox", "--as", "worker"), new RegExp(id));
    assert.match(f.a.run("board", "retract", id, "--as", "lead"), new RegExp(`${id} retracted`));
    assert.doesNotMatch(f.b.run("board", "inbox", "--as", "worker"), new RegExp(id));
    assert.match(f.b.run("board", "read", "--from", "lead"), /\(retracted\)/);
  } finally {
    f.cleanup();
  }
});

test("retracting a post that is not on the board fails and says so", () => {
  const f = fixture();
  try {
    const r = f.a.raw("board", "retract", "p-zzz", "--as", "lead");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /no post p-zzz/);
  } finally {
    f.cleanup();
  }
});
