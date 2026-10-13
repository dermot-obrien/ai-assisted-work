#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// A read-only board command pushes what an earlier command could not (Jules, WI-002 wave 1, #77).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fixture, postId } from "./fixture.mjs";

test("read-only board commands quietly push unpushed local commits left behind", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    f.b.run("board", "start", "--as", "b1");

    // Break b's remote so a post cannot be pushed and stays local.
    const good = execFileSync("git", ["-C", f.b.store, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", path.join(f.root, "nowhere.git")]);
    const id = postId(f.b.run("board", "post", "Message stranded locally", "--to", "a1", "--as", "b1"));
    assert.doesNotMatch(f.a.run("board", "inbox", "--as", "a1"), new RegExp(id), "a1 cannot see unpushed post yet");

    // Restore b's remote.
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", good]);

    // b runs a read-only command (inbox), which should push what was left behind.
    f.b.run("board", "inbox", "--as", "b1");

    // Now a1 can see b1's post.
    assert.match(f.a.run("board", "inbox", "--as", "a1"), new RegExp(id));
  } finally {
    f.cleanup();
  }
});
