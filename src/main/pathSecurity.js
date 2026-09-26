import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

export class PathSecurityError extends Error {
    constructor(message, code = "PATH_NOT_ALLOWED") {
        super(message);
        this.name = "PathSecurityError";
        this.code = code;
    }
}

function comparablePath(value) {
    const normalized = normalize(resolve(value));
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function requireConfiguredRoot(requestedPath, configuredPath, label) {
    if (!configuredPath) throw new PathSecurityError(`${label} folder is not configured`, "FOLDER_NOT_CONFIGURED");
    if (typeof requestedPath !== "string" || !requestedPath.trim()) throw new PathSecurityError(`Invalid ${label} folder`, "INVALID_PATH");
    if (comparablePath(requestedPath) !== comparablePath(configuredPath)) {
        throw new PathSecurityError(`${label} folder does not match the configured folder`);
    }
    return resolve(configuredPath);
}

export function requireChildName(value, label = "path segment") {
    if (typeof value !== "string" || !value.trim()) throw new PathSecurityError(`Invalid ${label}`, "INVALID_PATH_SEGMENT");
    if (isAbsolute(value) || value === "." || value === ".." || value.includes("/") || value.includes("\\") || value.includes("\0")) {
        throw new PathSecurityError(`Invalid ${label}`, "INVALID_PATH_SEGMENT");
    }
    return value;
}

export function requirePathInside(root, candidate, label = "path") {
    const rootPath = resolve(root);
    const candidatePath = resolve(candidate);
    const difference = relative(rootPath, candidatePath);
    if (difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference))) return candidatePath;
    throw new PathSecurityError(`${label} is outside the configured folder`);
}

export function requireCompatibleFolderRoots(sourcePath, destinationPath) {
    const source = resolve(sourcePath || "");
    const destination = resolve(destinationPath || "");
    if (comparablePath(source) === comparablePath(destination)) return { source, destination };

    const isNested = difference => difference !== "" && difference !== ".." && !difference.startsWith(`..${sep}`) && !isAbsolute(difference);
    if (isNested(relative(source, destination)) || isNested(relative(destination, source))) {
        throw new PathSecurityError("Screenshot and destination folders cannot contain one another", "INVALID_SETTINGS_PATHS");
    }
    return { source, destination };
}

export function configuredSourcePath(settings, requestedRoot, filename) {
    const root = requireConfiguredRoot(requestedRoot, settings?.screenshotFolderPath, "Screenshot");
    return requirePathInside(root, resolve(root, requireChildName(filename, "filename")), "Source image");
}

export function configuredCroppedPath(settings, requestedRoot, folderName, filename) {
    const outputRoot = requireConfiguredRoot(requestedRoot, settings?.destinationFolderPath, "Destination");
    const croppedRoot = resolve(outputRoot, "cropped");
    const folder = requireChildName(folderName, "folder name");
    const folderPath = requirePathInside(croppedRoot, resolve(croppedRoot, folder), "Cropped folder");
    return filename === undefined
        ? folderPath
        : requirePathInside(folderPath, resolve(folderPath, requireChildName(filename, "filename")), "Cropped image");
}

export function validateIpcSender(event, { rendererUrl } = {}) {
    const frame = event?.senderFrame;
    if (!frame || frame !== event.sender?.mainFrame) throw new PathSecurityError("IPC request did not originate from the main application frame", "INVALID_IPC_SENDER");
    const url = frame.url || "";
    const allowedDevelopmentOrigin = rendererUrl ? new URL(rendererUrl).origin : null;
    const origin = url ? new URL(url).origin : null;
    if (!url.startsWith("file://") && (!allowedDevelopmentOrigin || origin !== allowedDevelopmentOrigin)) {
        throw new PathSecurityError("IPC request originated from an untrusted page", "INVALID_IPC_SENDER");
    }
}
