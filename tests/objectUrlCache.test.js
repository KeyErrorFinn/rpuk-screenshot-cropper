import test from "node:test";
import assert from "node:assert/strict";
import { createObjectUrlCache } from "../src/renderer/src/lib/objectUrlCache.js";

test("object URL cache evicts and revokes the least recently used entry", () => {
    const revoked = [];
    const cache = createObjectUrlCache({ limit: 2, revoke: value => revoked.push(value) });
    cache.set("a", "url:a");
    cache.set("b", "url:b");
    assert.equal(cache.get("a"), "url:a");
    cache.set("c", "url:c");
    assert.deepEqual(revoked, ["url:b"]);
    assert.equal(cache.has("b"), false);
});

test("clearing the object URL cache revokes every retained URL", () => {
    const revoked = [];
    const cache = createObjectUrlCache({ limit: 2, revoke: value => revoked.push(value) });
    cache.set("a", "url:a"); cache.set("b", "url:b"); cache.clear();
    assert.deepEqual(revoked.sort(), ["url:a", "url:b"]);
    assert.equal(cache.size, 0);
});
