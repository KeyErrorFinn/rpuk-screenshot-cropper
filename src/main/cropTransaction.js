import { constants } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const ACTIVE_STATES = new Set(["planned", "backed-up", "staged", "committing"]);
const UNDOABLE_STATES = new Set(["complete"]);

function batchId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dateFolder(date) {
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getFullYear()).slice(2)}`;
}

async function pathExists(fileSystem, path) {
    try { await fileSystem.access(path); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

export async function chooseAvailablePath(fileSystem, desiredPath, reserved = new Set()) {
    const extension = extname(desiredPath);
    const stem = desiredPath.slice(0, -extension.length || undefined);
    for (let sequence = 1; sequence < 10000; sequence += 1) {
        const candidate = sequence === 1 ? desiredPath : `${stem} (${sequence})${extension}`;
        if (!reserved.has(candidate) && !(await pathExists(fileSystem, candidate))) {
            reserved.add(candidate);
            return candidate;
        }
    }
    throw new Error(`Could not reserve an output name for ${basename(desiredPath)}`);
}

function persistBatches(store, batches) {
    store.set("cropBatches", batches);
}

export function createCropTransactionService({ fileSystem, sharpFactory, store, userDataPath, trashItem, getCropInsets, getCropRegion, mapConcurrent }) {
    const transactionRoot = join(userDataPath, "crop-transactions");
    const undoRoot = join(userDataPath, "crop-undo");

    async function rollback(batch) {
        const errors = [];
        for (const item of batch.items) {
            try {
                if (!(await pathExists(fileSystem, item.sourcePath))) {
                    await fileSystem.mkdir(dirname(item.sourcePath), { recursive: true });
                    await fileSystem.copyFile(item.backupPath, item.sourcePath, constants.COPYFILE_EXCL);
                }
            } catch (error) {
                errors.push({ filename: basename(item.sourcePath), operation: "restore-source", error: error.message });
            }
            const committedOutputs = item.committedOutputs || (item.outputs || []).filter(output => typeof output === "string");
            for (const output of committedOutputs) {
                try { if (await pathExists(fileSystem, output)) await trashItem(output); }
                catch (error) { errors.push({ filename: basename(output), operation: "remove-output", error: error.message }); }
            }
        }
        batch.status = errors.length ? "recovery-failed" : "recovered";
        batch.errors = errors;
        if (!errors.length) await fileSystem.rm(join(undoRoot, batch.id), { recursive: true, force: true }).catch(() => {});
        return errors;
    }

    async function crop({ inputPath, outputPath, keepOriginalImage, filenames, cropConfiguration, onProgress }) {
        const id = batchId();
        const transactionDirectory = join(transactionRoot, id);
        const backupDirectory = join(undoRoot, id);
        const batch = { id, createdAt: new Date().toISOString(), status: "planned", items: [], errors: [] };
        const previousBatches = store.get("cropBatches", []);
        const batches = [batch, ...previousBatches].slice(0, 10);
        persistBatches(store, batches);
        const reserved = new Set();
        let completed = 0;
        let activeFilename;

        try {
            for (const filename of filenames) {
                activeFilename = filename;
                const sourcePath = join(inputPath, filename);
                const [metadata, stats] = await Promise.all([sharpFactory(sourcePath).metadata(), fileSystem.stat(sourcePath)]);
                const folder = dateFolder(stats.mtime);
                const croppedName = `cropped_${filename}`;
                const croppedOutputPath = await chooseAvailablePath(fileSystem, join(outputPath, "cropped", folder, croppedName), reserved);
                const outputs = [{ kind: "cropped", stagedPath: join(transactionDirectory, "cropped", folder, basename(croppedOutputPath)), outputPath: croppedOutputPath }];
                if (keepOriginalImage) {
                    const originalOutputPath = await chooseAvailablePath(fileSystem, join(outputPath, "original", folder, filename), reserved);
                    outputs.push({ kind: "original", stagedPath: join(transactionDirectory, "original", folder, basename(originalOutputPath)), outputPath: originalOutputPath });
                }
                batch.items.push({ filename, sourcePath, backupPath: join(backupDirectory, filename), folder, metadata: { width: metadata.width, height: metadata.height }, outputs, committedOutputs: [] });
            }
            persistBatches(store, batches);

            await fileSystem.mkdir(backupDirectory, { recursive: true });
            for (const item of batch.items) {
                await fileSystem.mkdir(dirname(item.backupPath), { recursive: true });
                await fileSystem.copyFile(item.sourcePath, item.backupPath, constants.COPYFILE_EXCL);
            }
            batch.status = "backed-up";
            persistBatches(store, batches);

            await mapConcurrent(batch.items, 2, async item => {
                activeFilename = item.filename;
                const cropInsets = getCropInsets(cropConfiguration, item.metadata.width, item.metadata.height);
                for (const output of item.outputs) {
                    await fileSystem.mkdir(dirname(output.stagedPath), { recursive: true });
                    if (output.kind === "cropped") await sharpFactory(item.sourcePath).extract(getCropRegion(item.metadata.width, item.metadata.height, cropInsets)).toFile(output.stagedPath);
                    else await fileSystem.copyFile(item.sourcePath, output.stagedPath, constants.COPYFILE_EXCL);
                }
                completed += 1;
                onProgress?.(completed / batch.items.length);
            });
            batch.status = "staged";
            persistBatches(store, batches);

            batch.status = "committing";
            persistBatches(store, batches);
            for (const item of batch.items) {
                activeFilename = item.filename;
                for (const output of item.outputs) {
                    await fileSystem.mkdir(dirname(output.outputPath), { recursive: true });
                    await fileSystem.copyFile(output.stagedPath, output.outputPath, constants.COPYFILE_EXCL);
                    item.committedOutputs.push(output.outputPath);
                    persistBatches(store, batches);
                }
            }
            await mapConcurrent(batch.items, 2, item => fileSystem.unlink(item.sourcePath));
            batch.status = "complete";
            batch.completedAt = new Date().toISOString();
            persistBatches(store, batches);
            await fileSystem.rm(transactionDirectory, { recursive: true, force: true });
            for (const expired of previousBatches.slice(9)) await fileSystem.rm(join(undoRoot, expired.id), { recursive: true, force: true }).catch(() => {});
            return { success: true, batchId: id, croppedImages: batch.items.map(item => ({ folder: item.folder, name: basename(item.outputs.find(output => output.kind === "cropped").outputPath) })) };
        } catch (error) {
            batch.errors = [{ filename: activeFilename, operation: batch.status, error: error.message }];
            if (batch.status === "committing") batch.errors.push(...await rollback(batch));
            else {
                batch.status = "failed";
                await fileSystem.rm(backupDirectory, { recursive: true, force: true }).catch(cleanupError => {
                    batch.errors.push({ filename: activeFilename, operation: "cleanup-backup", error: cleanupError.message });
                });
            }
            persistBatches(store, batches);
            await fileSystem.rm(transactionDirectory, { recursive: true, force: true }).catch(() => {});
            return { success: false, batchId: id, errors: batch.errors };
        }
    }

    async function undo(id) {
        const batches = store.get("cropBatches", []);
        const batch = id ? batches.find(item => item.id === id) : batches.find(item => UNDOABLE_STATES.has(item.status));
        if (!batch || !UNDOABLE_STATES.has(batch.status)) return { success: false, reason: "Crop batch is not available to undo" };
        const conflicts = [];
        for (const item of batch.items) if (await pathExists(fileSystem, item.sourcePath)) conflicts.push({ filename: item.filename, error: "A file already exists at the original location" });
        if (conflicts.length) return { success: false, conflicts };
        const errors = [];
        const restoredImages = [];
        for (const item of batch.items) {
            try {
                await fileSystem.mkdir(dirname(item.sourcePath), { recursive: true });
                await fileSystem.copyFile(item.backupPath, item.sourcePath, constants.COPYFILE_EXCL);
                restoredImages.push({ name: item.filename });
            } catch (error) { errors.push({ filename: item.filename, operation: "restore-source", error: error.message }); continue; }
            for (const output of item.committedOutputs || []) {
                try { if (await pathExists(fileSystem, output)) await trashItem(output); }
                catch (error) { errors.push({ filename: basename(output), operation: "remove-output", error: error.message }); }
            }
        }
        batch.status = errors.length ? "undo-failed" : "undone";
        batch.errors = errors;
        persistBatches(store, batches);
        return { success: errors.length === 0, errors, restoredImages };
    }

    async function recover() {
        const batches = store.get("cropBatches", []);
        const recovered = [];
        const errors = [];
        for (const batch of batches.filter(item => ACTIVE_STATES.has(item.status))) {
            if (batch.status === "committing") errors.push(...await rollback(batch));
            else {
                batch.status = "aborted";
                await fileSystem.rm(join(undoRoot, batch.id), { recursive: true, force: true }).catch(() => {});
            }
            recovered.push(batch.id);
        }
        if (recovered.length) persistBatches(store, batches);
        await fileSystem.rm(transactionRoot, { recursive: true, force: true }).catch(() => {});
        return { recovered, errors };
    }

    return { crop, undo, recover, getHistory: () => store.get("cropBatches", []).map(batch => ({ id: batch.id, createdAt: batch.createdAt, completedAt: batch.completedAt, status: batch.status, itemCount: batch.items.length, files: batch.items.map(item => item.filename), errors: batch.errors || [] })) };
}
