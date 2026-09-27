import { createHash } from 'node:crypto'
import { join } from 'node:path'

export const THUMBNAIL_WIDTH = 480
export const THUMBNAIL_HEIGHT = 270
export const IMAGE_LOAD_CONCURRENCY = 6

export function createTaskLimiter(limit) {
    const queue = []
    let active = 0
    const runNext = () => {
        while (active < limit && queue.length) {
            const job = queue.shift()
            active += 1
            Promise.resolve()
                .then(job.task)
                .then(job.resolve, job.reject)
                .finally(() => {
                    active -= 1
                    runNext()
                })
        }
    }
    return (task) =>
        new Promise((resolve, reject) => {
            queue.push({ task, resolve, reject })
            runNext()
        })
}

export async function mapWithConcurrency(items, limit, mapper) {
    const results = new Array(items.length)
    let nextIndex = 0

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex++
            results[index] = await mapper(items[index], index)
        }
    }

    const workerCount = Math.min(Math.max(1, limit), items.length)
    await Promise.all(Array.from({ length: workerCount }, worker))
    return results
}

export function getThumbnailCacheKey(filePath, stats) {
    return createHash('sha256').update(`${filePath}\0${stats.size}\0${stats.mtimeMs}`).digest('hex')
}

export async function getOrCreateThumbnail(
    filePath,
    stats,
    { cacheDirectory, fileSystem, sharpFactory }
) {
    await fileSystem.mkdir(cacheDirectory, { recursive: true })
    const cachePath = join(cacheDirectory, `${getThumbnailCacheKey(filePath, stats)}.webp`)

    try {
        const thumbnail = await fileSystem.readFile(cachePath)
        fileSystem.utimes?.(cachePath, new Date(), new Date()).catch(() => {})
        return thumbnail
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error
    }

    const thumbnail = await sharpFactory(filePath)
        .rotate()
        .resize({
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: 78 })
        .toBuffer()

    await fileSystem.writeFile(cachePath, thumbnail)
    return thumbnail
}

const thumbnailJobs = new Map()

export async function getOrCreateThumbnailDeduplicated(filePath, stats, dependencies) {
    const key = getThumbnailCacheKey(filePath, stats)
    if (thumbnailJobs.has(key)) return thumbnailJobs.get(key)
    const job = getOrCreateThumbnail(filePath, stats, dependencies).finally(() =>
        thumbnailJobs.delete(key)
    )
    thumbnailJobs.set(key, job)
    return job
}
