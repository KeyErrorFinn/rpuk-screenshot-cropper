import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GALLERY_COLUMNS, MAX_GALLERY_COLUMNS, MIN_GALLERY_COLUMNS, clampGalleryColumns } from "../src/renderer/src/lib/galleryZoom.js";

test("gallery defaults to four columns", () => {
    assert.equal(DEFAULT_GALLERY_COLUMNS, 4);
});

test("gallery zoom supports one through seven columns", () => {
    assert.equal(MIN_GALLERY_COLUMNS, 1);
    assert.equal(MAX_GALLERY_COLUMNS, 7);
    assert.equal(clampGalleryColumns(1), 1);
    assert.equal(clampGalleryColumns(7), 7);
});

test("gallery zoom clamps values outside its range", () => {
    assert.equal(clampGalleryColumns(-5), 1);
    assert.equal(clampGalleryColumns(20), 7);
});
