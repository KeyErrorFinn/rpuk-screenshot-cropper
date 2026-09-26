export type CropInsets = { top: number; right: number; bottom: number; left: number; referenceWidth?: number; referenceHeight?: number };
export type ImageReference = { folder: string; name: string };
export type AppSettings = { screenshotFolderPath: string; destinationFolderPath: string; keepOriginalImage: boolean; gyazoAccessToken?: string; cropInsets: CropInsets; cropPresets?: Record<string, CropInsets> };
export type RemoveListener = () => void;

export interface RendererApi {
    minimize(): void; maximize(): void; close(): void; setFullscreen(enabled: boolean): void;
    onWindowMaximize(callback: () => void): RemoveListener; onWindowRestore(callback: () => void): RemoveListener;
    onSourceFolderChanged(callback: (change?: { path?: string; reconcile?: boolean }) => void): RemoveListener;
    onCroppedFolderChanged(callback: (change?: { path?: string; reconcile?: boolean }) => void): RemoveListener;
    onImageWarning(callback: (warning: { message: string; detail?: string }) => void): RemoveListener;
    onOperationProgress(callback: (progress: { type: "crop" | "upload"; value: number }) => void): RemoveListener;
    onSettingsChanged(callback: (settings: AppSettings) => void): RemoveListener;
    selectFolder(): Promise<string | null>; getFolderHealth(): Promise<unknown>; exportDiagnostics(): Promise<boolean>;
    getSettings(): Promise<AppSettings | undefined>; setSettings(settings: AppSettings): Promise<boolean>;
    getPreference(key: string): Promise<unknown>; setPreference(key: string, value: unknown): Promise<boolean>;
    getScreenshots(path: string): Promise<unknown[]>; importImageFiles(files: FileList | File[]): Promise<unknown>; importClipboardImage(): Promise<unknown>;
    getSourceThumbnail(path: string, filename: string): Promise<Uint8Array>; getCroppedFolders(path: string): Promise<unknown[]>;
    getFolderImages(path: string, folder: string): Promise<unknown[]>; getCroppedThumbnail(path: string, folder: string, filename: string): Promise<Uint8Array>;
    getSourceImage(path: string, filename: string): Promise<Uint8Array>; getCroppedImage(path: string, folder: string, filename: string): Promise<Uint8Array>;
    uploadToGyazo(path: string, token: string, images: ImageReference[]): Promise<unknown>; getPendingUpload(): Promise<unknown>; cancelUpload(): Promise<boolean>;
    undoLastCrop(): Promise<unknown>; getCropBatches(): Promise<unknown[]>; undoCropBatch(id: string): Promise<unknown>;
    toggleFavourite(path: string, folder: string, filename: string): Promise<boolean>; setImageTags(path: string, folder: string, filename: string, tags: string[]): Promise<string[]>;
    deleteCroppedImages(path: string, images: ImageReference[]): Promise<unknown>; copyText(text: string): void;
    openCroppedFolder(path: string, folder: string): void; copySourceImage(path: string, filename: string): void; copyCroppedImage(path: string, folder: string, filename: string): void;
    cropScreenshots(input: string, output: string, keepOriginal: boolean, filenames: string[], configuration: { cropInsets?: CropInsets; cropPresets?: Record<string, CropInsets> }): Promise<unknown>;
}

declare global { interface Window { api: RendererApi; __cropEditorDirty?: boolean } }
