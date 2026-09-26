import { join } from "node:path";
import { IPC_CHANNELS } from "../shared/ipcContracts.js";

export function createFolderMonitor({ watch, getSettings, send, invalidate, logger, recover, reconciliationMs = 30_000, paused = false }) {
    let watchers = [];
    let timer;
    let isPaused = paused;
    const stop = () => { watchers.forEach(watcher => watcher.close()); watchers = []; clearInterval(timer); timer = undefined; };
    const start = () => {
        stop();
        if (isPaused) return;
        const settings = getSettings();
        const paths = [[settings.screenshotFolderPath, IPC_CHANNELS.sourceChanged], [settings.destinationFolderPath, IPC_CHANNELS.croppedChanged]];
        for (const [path, channel] of paths) {
            if (!path) continue;
            try {
                const watcher = watch(path, { recursive: true }, (_eventType, filename) => {
                    const relativePath = filename ? String(filename) : null;
                    invalidate(relativePath ? join(path, relativePath) : path);
                    send(channel, { path: relativePath });
                });
                watcher.on("error", error => { logger.error("watcher.failed", { path, error: error.message }); send(IPC_CHANNELS.imageWarning, { message: `Folder monitoring stopped for ${path}: ${error.message}` }); setTimeout(async () => { await recover?.(); start(); }, 2000); });
                watchers.push(watcher);
            } catch (error) { send(IPC_CHANNELS.imageWarning, { message: `Folder is unavailable: ${path}`, detail: error.message }); }
        }
        timer = setInterval(async () => { const recovered = await recover?.(); if (recovered) { start(); return; } invalidate(); send(IPC_CHANNELS.sourceChanged, { reconcile: true }); send(IPC_CHANNELS.croppedChanged, { reconcile: true }); }, reconciliationMs);
    };
    return { start, stop, setPaused(value) { isPaused = Boolean(value); start(); }, get paused() { return isPaused; } };
}
