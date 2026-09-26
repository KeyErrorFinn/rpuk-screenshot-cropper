import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, open, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createImageIndex } from "../src/main/imageIndex.js";

function store() { const values = new Map(); return { get: (key, fallback) => values.has(key) ? structuredClone(values.get(key)) : fallback, set: (key, value) => values.set(key, structuredClone(value)) }; }

test("image identity survives a rename and cached dimensions avoid repeated metadata", async t => {
    const root = await mkdtemp(join(tmpdir(), "image-index-")); t.after(() => rm(root, { recursive: true, force: true }));
    const firstPath = join(root, "first.png"); const secondPath = join(root, "renamed.png");
    await writeFile(firstPath, Buffer.alloc(140_000, 12));
    let metadataLoads = 0;
    const index = createImageIndex({ fileSystem: { stat, open }, store: store() });
    const first = await index.metadata(firstPath, async () => { metadataLoads += 1; return { width: 1920, height: 1080 }; });
    await index.metadata(firstPath, async () => { metadataLoads += 1; return { width: 1, height: 1 }; });
    await rename(firstPath, secondPath);
    const moved = await index.metadata(secondPath, async () => { metadataLoads += 1; return { width: 1, height: 1 }; });
    assert.equal(first.id, moved.id);
    assert.equal(moved.width, 1920);
    assert.equal(metadataLoads, 1);
});

test("avoids filesystem metadata work until a watcher invalidates the image", async t => {
    const root = await mkdtemp(join(tmpdir(), "image-index-delta-")); t.after(() => rm(root, { recursive: true, force: true }));
    const filePath = join(root, "shot.png"); await writeFile(filePath, Buffer.alloc(16, 2));
    let statCalls = 0;
    const index = createImageIndex({ fileSystem: { stat: async path => { statCalls += 1; return stat(path); }, open }, store: store() });
    await index.metadata(filePath, async () => ({ width: 100, height: 50 }));
    await index.metadata(filePath, async () => ({ width: 1, height: 1 }));
    assert.equal(statCalls, 1);
    index.invalidate(filePath);
    await index.metadata(filePath, async () => ({ width: 1, height: 1 }));
    assert.equal(statCalls, 2);
});

test("batches a cold metadata scan into one persisted index write", async t => {
    const root = await mkdtemp(join(tmpdir(), "image-index-batch-")); t.after(() => rm(root, { recursive: true, force: true }));
    const writes = [];
    const index = createImageIndex({
        fileSystem: { stat },
        store: { get: (_key, fallback) => fallback, set: (_key, value) => writes.push(structuredClone(value)) },
        persistDelayMs: 60_000,
    });
    for (let position = 0; position < 20; position += 1) {
        const filePath = join(root, `${position}.png`);
        await writeFile(filePath, Buffer.alloc(16, position));
        await index.metadata(filePath, async () => ({ width: 100, height: 50 }));
    }
    assert.equal(writes.length, 0);
    index.flush();
    assert.equal(writes.length, 1);
    assert.equal(Object.keys(writes[0].records).length, 20);
});

test("peeks cached metadata without touching the filesystem", async t => {
    const root = await mkdtemp(join(tmpdir(), "image-index-peek-")); t.after(() => rm(root, { recursive: true, force: true }));
    const filePath = join(root, "shot.png"); await writeFile(filePath, Buffer.alloc(16, 4));
    const index = createImageIndex({ fileSystem: { stat }, store: store(), persistDelayMs: 60_000 });
    const metadata = await index.metadata(filePath, async () => ({ width: 320, height: 180 }));
    assert.equal(index.peek(filePath).id, metadata.id);
    index.flush();
});
