import { dirname, join, resolve } from "node:path";

const identityOf = stats => `${stats.dev}:${stats.ino}`;

export async function getFolderIdentity(fileSystem, path) {
    const stats = await fileSystem.stat(path, { bigint: true });
    if (!stats.isDirectory()) throw new Error("Configured path is not a folder");
    return identityOf(stats);
}

export async function findMovedFolder(fileSystem, originalPath, identity, { maximumDirectories = 500 } = {}) {
    if (!originalPath || !identity) return null;
    const original = resolve(originalPath);
    const roots = [...new Set([dirname(original), dirname(dirname(original))])];
    const queue = roots.map(path => ({ path, depth: 0 }));
    const visited = new Set();
    while (queue.length && visited.size < maximumDirectories) {
        const current = queue.shift();
        if (visited.has(current.path)) continue;
        visited.add(current.path);
        const entries = await fileSystem.readdir(current.path, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const candidate = join(current.path, entry.name);
            const stats = await fileSystem.stat(candidate, { bigint: true }).catch(() => null);
            if (stats && identityOf(stats) === identity) return candidate;
            if (current.depth < 1) queue.push({ path: candidate, depth: current.depth + 1 });
            if (visited.size + queue.length >= maximumDirectories) break;
        }
    }
    return null;
}
