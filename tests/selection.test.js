import test from "node:test";
import assert from "node:assert/strict";
import { countSelectedImages, createFolderSelection, getImageSelectionId, pruneStableSelection, remapIndexSelection } from "../src/renderer/src/lib/selection.js";

test("counts selected images across multiple folders", () => {
    assert.equal(countSelectedImages({ first: { 0: true, 1: false }, second: { 0: true, 1: true } }), 3);
});

test("select all creates a selection for every image", () => {
    assert.deepEqual(createFolderSelection(3, {}), { 0: true, 1: true, 2: true });
});

test("select all clears a folder when every image is selected", () => {
    assert.deepEqual(createFolderSelection(2, { 0: true, 1: true }), { 0: false, 1: false });
});

test("select all fills gaps in a partial selection", () => {
    assert.deepEqual(createFolderSelection(3, { 0: true, 2: true }), { 0: true, 1: true, 2: true });
});

test("remaps index-based selections when refreshed images are reordered", () => {
    const previousImages = [{ name: "one.png" }, { name: "two.png" }, { name: "three.png" }];
    const nextImages = [{ name: "three.png" }, { name: "one.png" }, { name: "two.png" }];

    assert.deepEqual(remapIndexSelection(previousImages, nextImages, { 0: true, 2: true }), { 0: true, 1: true });
});

test("drops an index-based selection only when its image was removed", () => {
    const previousImages = [{ name: "one.png" }, { name: "two.png" }];
    const nextImages = [{ name: "two.png" }];

    assert.deepEqual(remapIndexSelection(previousImages, nextImages, { 0: true, 1: true }), { 0: true });
});

test("prunes unavailable stable selections while retaining existing images", () => {
    const images = [{ id: "kept" }, { id: "unselected" }];

    assert.deepEqual(pruneStableSelection({ kept: true, removed: true, ignored: false }, images), { kept: true });
});

test("uses a unique selection identity for duplicate files with the same content", () => {
    const first = { id: "same-content", name: "image.png" };
    const duplicate = { id: "same-content", name: "image (2).png" };

    assert.notEqual(getImageSelectionId(first), getImageSelectionId(duplicate));
});
