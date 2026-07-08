import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("cli help exits successfully", () => {
  const result = spawnSync(process.execPath, ["src/cli.js", "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /voicepath/);
  assert.equal(result.stderr, "");
});
