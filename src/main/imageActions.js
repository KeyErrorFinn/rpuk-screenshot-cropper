import { basename, join } from "path";
import { IPC_CHANNELS, ipcSchemas, parseIpcArguments } from "../shared/ipcContracts.js";

export const imageActionChannels = {
    openCroppedFolder: IPC_CHANNELS.openCroppedFolder,
    copySource: IPC_CHANNELS.copySource,
    copyCropped: IPC_CHANNELS.copyCropped,
};

export function createImageActions({ shell, clipboard, nativeImage }) {
    return {
        async openCroppedFolder(outputPath, folderName) {
            if (!outputPath || !folderName) return false;
            const error = await shell.openPath(join(outputPath, "cropped", basename(folderName)));
            return error === "";
        },

        copySource(inputPath, filename) {
            if (!inputPath || !filename) return false;
            const image = nativeImage.createFromPath(join(inputPath, basename(filename)));
            if (image.isEmpty()) return false;
            clipboard.writeImage(image);
            return true;
        },

        copyCropped(outputPath, folderName, filename) {
            if (!outputPath || !folderName || !filename) return false;
            const image = nativeImage.createFromPath(join(outputPath, "cropped", basename(folderName), basename(filename)));
            if (image.isEmpty()) return false;
            clipboard.writeImage(image);
            return true;
        },
    };
}

export function createSecuredImageActions({ shell, clipboard, nativeImage, resolveSource, resolveCropped }) {
    return {
        async openCroppedFolder(outputPath, folderName) {
            const error = await shell.openPath(resolveCropped(outputPath, folderName));
            return error === "";
        },
        copySource(inputPath, filename) {
            const image = nativeImage.createFromPath(resolveSource(inputPath, filename));
            if (image.isEmpty()) return false;
            clipboard.writeImage(image);
            return true;
        },
        copyCropped(outputPath, folderName, filename) {
            const image = nativeImage.createFromPath(resolveCropped(outputPath, folderName, filename));
            if (image.isEmpty()) return false;
            clipboard.writeImage(image);
            return true;
        },
    };
}

export function registerImageActionHandlers({ ipcMain, shell, clipboard, nativeImage, resolveSource, resolveCropped, validateSender }) {
    const actions = resolveSource && resolveCropped
        ? createSecuredImageActions({ shell, clipboard, nativeImage, resolveSource, resolveCropped })
        : createImageActions({ shell, clipboard, nativeImage });
    const registrations = [
        [imageActionChannels.openCroppedFolder, ipcSchemas.croppedFolder, actions.openCroppedFolder],
        [imageActionChannels.copySource, ipcSchemas.sourceFile, actions.copySource],
        [imageActionChannels.copyCropped, ipcSchemas.croppedFile, actions.copyCropped],
    ];

    for (const [channel, schema, action] of registrations) {
        ipcMain.removeHandler(channel);
        ipcMain.removeAllListeners(channel);
        ipcMain.handle(channel, (event, ...args) => { validateSender?.(event); return action(...parseIpcArguments(schema, args)); });
        ipcMain.on(channel, (event, ...args) => {
            validateSender?.(event);
            Promise.resolve().then(() => action(...parseIpcArguments(schema, args))).catch(error => console.error(`Image action failed: ${channel}`, error));
        });
    }

    return actions;
}
