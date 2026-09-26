export const IPC_CHANNELS = Object.freeze({
    windowMinimize: "window:minimize", windowMaximize: "window:maximize", windowClose: "window:close", windowFullscreen: "window:fullscreen",
    windowMaximized: "window:maximized", windowRestored: "window:restored", sourceChanged: "images:source-changed", croppedChanged: "images:cropped-changed",
    imageWarning: "images:warning", operationProgress: "operations:progress", selectFolder: "dialog:selectFolder", getFolderHealth: "folders:get-health",
    exportDiagnostics: "diagnostics:export", getAppVersion: "app:get-version", getSettings: "settings:get", setSettings: "settings:set", settingsChanged: "settings:changed", getPreference: "preferences:get", setPreference: "preferences:set",
    getScreenshots: "images:get-screenshots", getSourceThumbnail: "images:get-source-thumbnail", getCroppedFolders: "images:get-cropped-folders",
    getFolderImages: "images:get-folder-images", getCroppedThumbnail: "images:get-cropped-thumbnail", getSourceImage: "images:get-source-image",
    getCroppedImage: "images:get-cropped-image", importFiles: "images:import-files", importClipboard: "images:import-clipboard", uploadGyazo: "images:upload-gyazo",
    getPendingUpload: "images:get-pending-upload", cancelUpload: "images:cancel-upload", undoLastCrop: "images:undo-last-crop", toggleFavourite: "images:toggle-favourite",
    setTags: "images:set-tags", deleteCropped: "images:delete-cropped", copyText: "clipboard:write-text", openCroppedFolder: "images:open-cropped-folder",
    copySource: "images:copy-source", copyCropped: "images:copy-cropped", cropScreenshots: "images:crop-screenshots", getCropBatches: "images:get-crop-batches",
    undoCropBatch: "images:undo-crop-batch",
});
