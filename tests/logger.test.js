import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, appendFile, readFile, rename, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLogger, redactDetails } from "../src/main/logger.js";

test("diagnostic redaction removes nested tokens and passwords", () => {
    assert.deepEqual(redactDetails({ accessToken: "secret", nested: { password: "hidden", value: 2 } }), { accessToken: "[redacted]", nested: { password: "[redacted]", value: 2 } });
});

test("diagnostic support data includes recent structured logs without secrets", async t => {
    const directory = await mkdtemp(join(tmpdir(), "cropper-logs-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const logger = createLogger({ directory, fileSystem: { mkdir, appendFile, readFile, rename, stat } });
    await logger.info("upload.failed", { accessToken: "secret", filename: "shot.png" });
    const recent = await logger.readRecent();
    assert.equal(recent[0].event, "upload.failed");
    assert.equal(recent[0].details.accessToken, "[redacted]");
    assert.equal(recent[0].details.filename, "shot.png");
});
