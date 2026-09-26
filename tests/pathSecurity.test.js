import test from "node:test";
import assert from "node:assert/strict";
import { configuredCroppedPath, configuredSourcePath, requireChildName, requireCompatibleFolderRoots, requireConfiguredRoot, requirePathInside } from "../src/main/pathSecurity.js";

const settings = { screenshotFolderPath: "C:\\Screenshots", destinationFolderPath: "C:\\Cropped" };

test("accepts the configured roots and direct image children", () => {
    assert.equal(requireConfiguredRoot("C:\\Screenshots", settings.screenshotFolderPath, "Screenshot"), "C:\\Screenshots");
    assert.match(configuredSourcePath(settings, "C:\\Screenshots", "shot.png"), /Screenshots[\\/]shot\.png$/);
    assert.match(configuredCroppedPath(settings, "C:\\Cropped", "14-09-26", "cropped_shot.png"), /cropped[\\/]14-09-26[\\/]cropped_shot\.png$/);
});

test("rejects roots that do not match saved settings", () => {
    assert.throws(() => requireConfiguredRoot("C:\\Elsewhere", settings.destinationFolderPath, "Destination"), { code: "PATH_NOT_ALLOWED" });
});

test("rejects traversal and nested renderer path segments", () => {
    for (const value of ["..", "../secret", "..\\secret", "folder/file", "folder\\file"]) {
        assert.throws(() => requireChildName(value));
    }
});

test("rejects candidates outside an approved root", () => {
    assert.throws(() => requirePathInside("C:\\Cropped", "C:\\Windows\\secret.png"));
});

test("allows screenshots and managed cropped output to share the same root", () => {
    assert.deepEqual(requireCompatibleFolderRoots("C:\\Screenshots", "C:\\Screenshots"), {
        source: "C:\\Screenshots",
        destination: "C:\\Screenshots",
    });
});

test("allows separate roots but rejects distinct parent and child roots", () => {
    assert.doesNotThrow(() => requireCompatibleFolderRoots("C:\\Screenshots", "D:\\Cropped"));
    assert.throws(() => requireCompatibleFolderRoots("C:\\Screenshots", "C:\\Screenshots\\Exports"), { code: "INVALID_SETTINGS_PATHS" });
    assert.throws(() => requireCompatibleFolderRoots("C:\\Screenshots\\Incoming", "C:\\Screenshots"), { code: "INVALID_SETTINGS_PATHS" });
});
