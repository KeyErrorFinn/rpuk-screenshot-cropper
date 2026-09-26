import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels.js';

// Custom APIs for renderer
const api = {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.windowMinimize),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.windowMaximize),
    close: () => ipcRenderer.send(IPC_CHANNELS.windowClose),
    setFullscreen: (enabled) => ipcRenderer.send(IPC_CHANNELS.windowFullscreen, enabled),
    onWindowMaximize: (callback) => { const listener = () => callback(); ipcRenderer.on(IPC_CHANNELS.windowMaximized, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.windowMaximized, listener); },
    onWindowRestore: (callback) => { const listener = () => callback(); ipcRenderer.on(IPC_CHANNELS.windowRestored, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.windowRestored, listener); },
    onSourceFolderChanged: (callback) => { const listener = (_, change) => callback(change); ipcRenderer.on(IPC_CHANNELS.sourceChanged, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.sourceChanged, listener); },
    onCroppedFolderChanged: (callback) => { const listener = (_, change) => callback(change); ipcRenderer.on(IPC_CHANNELS.croppedChanged, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.croppedChanged, listener); },
    onImageWarning: (callback) => { const listener = (_, warning) => callback(warning); ipcRenderer.on(IPC_CHANNELS.imageWarning, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.imageWarning, listener); },
    onOperationProgress: (callback) => { const listener = (_, progress) => callback(progress); ipcRenderer.on(IPC_CHANNELS.operationProgress, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.operationProgress, listener); },
    onSettingsChanged: (callback) => { const listener = (_, settings) => callback(settings); ipcRenderer.on(IPC_CHANNELS.settingsChanged, listener); return () => ipcRenderer.removeListener(IPC_CHANNELS.settingsChanged, listener); },

    selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.selectFolder),
    getFolderHealth: () => ipcRenderer.invoke(IPC_CHANNELS.getFolderHealth),
    exportDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.exportDiagnostics),
    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getAppVersion),

    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
    setSettings: (value) => ipcRenderer.invoke(IPC_CHANNELS.setSettings, value),
    getPreference: (key) => ipcRenderer.invoke(IPC_CHANNELS.getPreference, key),
    setPreference: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.setPreference, key, value),

    getScreenshots: (inputPath) => ipcRenderer.invoke(IPC_CHANNELS.getScreenshots, inputPath),
    importImageFiles: (files) => ipcRenderer.invoke(IPC_CHANNELS.importFiles, Array.from(files || []).map(file => webUtils.getPathForFile(file)).filter(Boolean)),
    importClipboardImage: () => ipcRenderer.invoke(IPC_CHANNELS.importClipboard),
    getSourceThumbnail: (inputPath, filename) => ipcRenderer.invoke(IPC_CHANNELS.getSourceThumbnail, inputPath, filename),
    getCroppedFolders: (outputPath) => ipcRenderer.invoke(IPC_CHANNELS.getCroppedFolders, outputPath),
    getFolderImages: (outputPath, folderName) => ipcRenderer.invoke(IPC_CHANNELS.getFolderImages, outputPath, folderName),
    getCroppedThumbnail: (outputPath, folderName, filename) => ipcRenderer.invoke(IPC_CHANNELS.getCroppedThumbnail, outputPath, folderName, filename),
    getSourceImage: (inputPath, filename) => ipcRenderer.invoke(IPC_CHANNELS.getSourceImage, inputPath, filename),
    getCroppedImage: (outputPath, folderName, filename) => ipcRenderer.invoke(IPC_CHANNELS.getCroppedImage, outputPath, folderName, filename),
    uploadToGyazo: (outputPath, accessToken, selectedImages) => ipcRenderer.invoke(IPC_CHANNELS.uploadGyazo, outputPath, accessToken, selectedImages),
    getPendingUpload: () => ipcRenderer.invoke(IPC_CHANNELS.getPendingUpload),
    cancelUpload: () => ipcRenderer.invoke(IPC_CHANNELS.cancelUpload),
    undoLastCrop: () => ipcRenderer.invoke(IPC_CHANNELS.undoLastCrop),
    getCropBatches: () => ipcRenderer.invoke(IPC_CHANNELS.getCropBatches),
    undoCropBatch: (id) => ipcRenderer.invoke(IPC_CHANNELS.undoCropBatch, id),
    toggleFavourite: (outputPath, folderName, filename) => ipcRenderer.invoke(IPC_CHANNELS.toggleFavourite, outputPath, folderName, filename),
    setImageTags: (outputPath, folderName, filename, tags) => ipcRenderer.invoke(IPC_CHANNELS.setTags, outputPath, folderName, filename, tags),
    deleteCroppedImages: (outputPath, images) => ipcRenderer.invoke(IPC_CHANNELS.deleteCropped, outputPath, images),
    copyText: (text) => ipcRenderer.send(IPC_CHANNELS.copyText, text),
    openCroppedFolder: (outputPath, folderName) => ipcRenderer.send(IPC_CHANNELS.openCroppedFolder, outputPath, folderName),
    copySourceImage: (inputPath, filename) => ipcRenderer.send(IPC_CHANNELS.copySource, inputPath, filename),
    copyCroppedImage: (outputPath, folderName, filename) => ipcRenderer.send(IPC_CHANNELS.copyCropped, outputPath, folderName, filename),

    cropScreenshots: (inputPath, outputPath, keepOriginalImage, screenshotFilenames, cropConfiguration) => ipcRenderer.invoke(IPC_CHANNELS.cropScreenshots, inputPath, outputPath, keepOriginalImage, screenshotFilenames, cropConfiguration)
};

try {
    contextBridge.exposeInMainWorld('api', api);
} catch (error) {
    console.error(error);
}
