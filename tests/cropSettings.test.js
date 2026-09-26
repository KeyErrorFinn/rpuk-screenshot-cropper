import assert from "node:assert/strict";
import test from "node:test";
import { CROP_PRESETS, DEFAULT_CROP_INSETS, getCropInsetsForResolution, getCropRegion, normalizeCropInsets, scaleCropInsets } from "../src/shared/cropSettings.js";

test("keeps the existing 1080p crop as the default", () => {
    assert.deepEqual(DEFAULT_CROP_INSETS, { top: 36, right: 0, bottom: 53, left: 0 });
    assert.deepEqual(getCropRegion(1920, 1080, DEFAULT_CROP_INSETS), { left: 0, top: 36, width: 1920, height: 991 });
});

test("provides crop presets scaled from 1080p", () => {
    assert.deepEqual(CROP_PRESETS.map(preset => [preset.label, preset.insets.top, preset.insets.bottom]), [
        ["720p", 24, 35], ["1080p", 36, 53], ["1440p", 48, 71], ["4K", 72, 106],
    ]);
});

test("supports cropping all four image edges", () => {
    assert.deepEqual(getCropRegion(1920, 1080, { top: 10, right: 20, bottom: 30, left: 40 }), { left: 40, top: 10, width: 1860, height: 1040 });
});

test("normalizes negative and fractional crop values", () => {
    assert.deepEqual(normalizeCropInsets({ top: -2, right: 2.6, bottom: "4", left: null }), { top: 0, right: 3, bottom: 4, left: 0 });
});

test("rejects crop margins that remove the whole image", () => {
    assert.throws(() => getCropRegion(100, 100, { top: 50, bottom: 50, left: 0, right: 0 }), /leave part of the image visible/);
});

test("scales a saved preview crop to screenshots at another resolution", () => {
    const saved = { top: 36, right: 10, bottom: 53, left: 20, referenceWidth: 1920, referenceHeight: 1080 };
    assert.deepEqual(scaleCropInsets(saved, 3840, 2160), { top: 72, right: 20, bottom: 106, left: 40 });
});

test("uses an exact saved preset for a matching screenshot resolution", () => {
    const configuration = {
        cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 },
        cropPresets: {
            "2560x1440": { top: 100, right: 20, bottom: 120, left: 30, referenceWidth: 2560, referenceHeight: 1440 },
        },
    };
    assert.deepEqual(getCropInsetsForResolution(configuration, 2560, 1440), { top: 100, right: 20, bottom: 120, left: 30 });
});

test("falls back to scaling the most recent crop for an unsaved resolution", () => {
    const configuration = { cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} };
    assert.deepEqual(getCropInsetsForResolution(configuration, 3840, 2160), { top: 72, right: 0, bottom: 106, left: 0 });
});
