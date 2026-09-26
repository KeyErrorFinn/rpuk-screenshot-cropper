import test from "node:test";
import assert from "node:assert/strict";
import { ipcSchemas, parseIpcArguments } from "../src/shared/ipcContracts.js";

test("shared IPC schemas reject traversal, oversized batches, and malformed settings", () => {
    assert.throws(() => parseIpcArguments(ipcSchemas.croppedFile, ["C:/output", "../escape", "shot.png"]), error => error.code === "INVALID_IPC_ARGUMENTS");
    assert.throws(() => parseIpcArguments(ipcSchemas.images, ["C:/output", Array.from({ length: 1001 }, () => ({ folder: "date", name: "shot.png" }))]), error => error.code === "INVALID_IPC_ARGUMENTS");
    assert.throws(() => parseIpcArguments(ipcSchemas.settings, [{ screenshotFolderPath: "C:/source", destinationFolderPath: "C:/output", keepOriginalImage: "yes", cropInsets: { top: 0, right: 0, bottom: 0, left: 0 } }]), error => error.code === "INVALID_IPC_ARGUMENTS");
});

test("crop IPC schema accepts complete resolution-aware configuration", () => {
    const args = ["C:/source", "C:/output", false, ["shot.png"], { cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} }];
    assert.deepEqual(parseIpcArguments(ipcSchemas.crop, args), args);
});
