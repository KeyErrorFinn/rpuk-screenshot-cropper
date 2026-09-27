import { dirname, resolve, sep } from 'node:path'

export function createDirectoryCatalog({ fileSystem }) {
    const entriesByDirectory = new Map()
    return {
        async list(directory) {
            const key = resolve(directory)
            if (!entriesByDirectory.has(key))
                entriesByDirectory.set(key, await fileSystem.readdir(key, { withFileTypes: true }))
            return entriesByDirectory.get(key)
        },
        invalidate(changedPath) {
            const target = resolve(changedPath)
            entriesByDirectory.delete(target)
            entriesByDirectory.delete(dirname(target))
            for (const key of entriesByDirectory.keys())
                if (target.startsWith(`${key}${sep}`)) entriesByDirectory.delete(key)
        },
        clear() {
            entriesByDirectory.clear()
        },
        get size() {
            return entriesByDirectory.size
        }
    }
}
