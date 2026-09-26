import test from "node:test";
import assert from "node:assert/strict";
import { calculateWindowBounds } from "../src/main/windowBounds.js";

test("uses 900 by 670 on a 1080p display", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    }), { width: 900, height: 670, x: 510, y: 185 });
});

test("scales up proportionally on a 1440p display", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 2560, height: 1440 },
        workArea: { x: 0, y: 0, width: 2560, height: 1400 },
    }), { width: 1200, height: 893, x: 680, y: 253 });
});

test("scales up proportionally on a 4K display", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 3840, height: 2160 },
        workArea: { x: 0, y: 0, width: 3840, height: 2080 },
    }), { width: 1800, height: 1340, x: 1020, y: 370 });
});

test("scales down proportionally on a 720p display", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 1280, height: 720 },
        workArea: { x: 0, y: 0, width: 1280, height: 680 },
    }), { width: 600, height: 447, x: 340, y: 116 });
});

test("centres the window on a monitor with a negative desktop position", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 1920, height: 1080 },
        workArea: { x: -1920, y: 0, width: 1920, height: 1040 },
    }), { width: 900, height: 670, x: -1410, y: 185 });
});

test("constrains the scaled window to the usable work area", () => {
    assert.deepEqual(calculateWindowBounds({
        size: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 800, height: 600 },
    }), { width: 800, height: 600, x: 0, y: 0 });
});
