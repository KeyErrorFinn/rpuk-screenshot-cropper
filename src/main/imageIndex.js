import { createHash } from 'node:crypto'

const normalizedIndex = (value) => ({
    records: value?.records || {},
    paths: value?.paths || {},
    fileKeys: value?.fileKeys || {}
})
const statValue = (value) => (typeof value === 'bigint' ? value.toString() : String(value ?? 0))

function fileIdentity(filePath, stats) {
    const device = statValue(stats.dev)
    const inode = statValue(stats.ino)
    if (inode !== '0') return `${device}:${inode}:${statValue(stats.birthtimeMs)}`
    return `${filePath}:${statValue(stats.birthtimeMs)}:${statValue(stats.size)}`
}

const generatedId = (fileKey) => createHash('sha256').update(`file:${fileKey}`).digest('hex')

export function createImageIndex({ fileSystem, store, persistDelayMs = 250 }) {
    const index = normalizedIndex(store.get('imageIndex', {}))
    const verifiedPaths = new Set()
    let persistTimer
    let dirty = false

    const flush = () => {
        clearTimeout(persistTimer)
        persistTimer = undefined
        if (!dirty) return
        dirty = false
        store.set('imageIndex', index)
    }
    const schedulePersist = () => {
        dirty = true
        if (persistTimer) return
        persistTimer = setTimeout(flush, persistDelayMs)
        persistTimer.unref?.()
    }

    return {
        async metadata(filePath, metadataLoader) {
            const knownId = index.paths[filePath]
            const known = knownId && index.records[knownId]
            if (known && verifiedPaths.has(filePath))
                return { ...known, modified: new Date(known.mtimeMs) }

            const stats = await fileSystem.stat(filePath)
            const key = fileIdentity(filePath, stats)
            if (
                known &&
                known.size === Number(stats.size) &&
                known.mtimeMs === Number(stats.mtimeMs)
            ) {
                verifiedPaths.add(filePath)
                let changed = false
                if (known.fileKey !== key) {
                    known.fileKey = key
                    changed = true
                }
                if (index.fileKeys[key] !== knownId) {
                    index.fileKeys[key] = knownId
                    changed = true
                }
                if (Date.now() - (known.lastSeenAt || 0) > 60 * 60 * 1000) {
                    known.lastSeenAt = Date.now()
                    changed = true
                }
                if (changed) schedulePersist()
                return { ...known, modified: stats.mtime }
            }

            const id = index.fileKeys[key] || knownId || generatedId(key)
            const existing = index.records[id]
            const dimensions =
                existing?.width && existing?.height ? existing : await metadataLoader()
            const record = {
                id,
                fileKey: key,
                path: filePath,
                size: Number(stats.size),
                mtimeMs: Number(stats.mtimeMs),
                width: dimensions.width,
                height: dimensions.height,
                lastSeenAt: Date.now()
            }
            if (existing?.path && existing.path !== filePath && index.paths[existing.path] === id)
                delete index.paths[existing.path]
            index.records[id] = record
            index.paths[filePath] = id
            index.fileKeys[key] = id
            verifiedPaths.add(filePath)
            schedulePersist()
            return { ...record, modified: stats.mtime }
        },
        peek(filePath) {
            const record = index.records[index.paths[filePath]]
            if (record && Date.now() - (record.lastSeenAt || 0) > 24 * 60 * 60 * 1000) {
                record.lastSeenAt = Date.now()
                schedulePersist()
            }
            return record ? { ...record, modified: new Date(record.mtimeMs) } : null
        },
        invalidate(changedPath) {
            if (!changedPath) {
                verifiedPaths.clear()
                return
            }
            for (const path of verifiedPaths)
                if (
                    path === changedPath ||
                    path.startsWith(`${changedPath}\\`) ||
                    path.startsWith(`${changedPath}/`)
                )
                    verifiedPaths.delete(path)
        },
        cleanup(maxAgeMs = 45 * 24 * 60 * 60 * 1000) {
            const cutoff = Date.now() - maxAgeMs
            let changed = false
            for (const [id, record] of Object.entries(index.records)) {
                if ((record.lastSeenAt || 0) >= cutoff) continue
                delete index.records[id]
                for (const [path, pathId] of Object.entries(index.paths))
                    if (pathId === id) delete index.paths[path]
                for (const [key, keyId] of Object.entries(index.fileKeys))
                    if (keyId === id) delete index.fileKeys[key]
                changed = true
            }
            if (changed) schedulePersist()
        },
        flush
    }
}
