import assert from 'node:assert/strict'
import test from 'node:test'
import {
    getOrCreateThumbnail,
    getThumbnailCacheKey,
    mapWithConcurrency,
    THUMBNAIL_HEIGHT,
    THUMBNAIL_WIDTH
} from '../src/main/imagePipeline.js'

test('mapWithConcurrency preserves input order', async () => {
    const result = await mapWithConcurrency([30, 5, 15], 2, async (delay) => {
        await new Promise((resolve) => setTimeout(resolve, delay))
        return delay * 2
    })
    assert.deepEqual(result, [60, 10, 30])
})

test('mapWithConcurrency never exceeds its worker limit', async () => {
    let active = 0
    let maximumActive = 0
    await mapWithConcurrency(Array.from({ length: 12 }), 3, async () => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await new Promise((resolve) => setTimeout(resolve, 2))
        active -= 1
    })
    assert.equal(maximumActive, 3)
})

test('thumbnail cache keys change when a source file changes', () => {
    const original = getThumbnailCacheKey('C:/screenshots/a.png', { size: 100, mtimeMs: 10 })
    assert.notEqual(
        original,
        getThumbnailCacheKey('C:/screenshots/a.png', { size: 101, mtimeMs: 10 })
    )
    assert.notEqual(
        original,
        getThumbnailCacheKey('C:/screenshots/a.png', { size: 100, mtimeMs: 11 })
    )
})

test('getOrCreateThumbnail returns a cache hit without invoking Sharp', async () => {
    const cached = Buffer.from('cached')
    let sharpCalls = 0
    const fileSystem = {
        mkdir: async () => {},
        readFile: async () => cached,
        writeFile: async () => assert.fail('cache hits must not be rewritten')
    }
    const result = await getOrCreateThumbnail(
        'C:/screenshots/a.png',
        { size: 10, mtimeMs: 20 },
        {
            cacheDirectory: 'C:/cache',
            fileSystem,
            sharpFactory: () => {
                sharpCalls += 1
            }
        }
    )
    assert.equal(result, cached)
    assert.equal(sharpCalls, 0)
})

test('getOrCreateThumbnail generates and persists a WebP on a cache miss', async () => {
    const generated = Buffer.from('generated')
    let resizeOptions
    let webpOptions
    let written
    const pipeline = {
        rotate: () => pipeline,
        resize: (options) => {
            resizeOptions = options
            return pipeline
        },
        webp: (options) => {
            webpOptions = options
            return pipeline
        },
        toBuffer: async () => generated
    }
    const fileSystem = {
        mkdir: async () => {},
        readFile: async () => {
            const error = new Error('missing')
            error.code = 'ENOENT'
            throw error
        },
        writeFile: async (path, value) => {
            written = { path, value }
        }
    }
    const result = await getOrCreateThumbnail(
        'C:/screenshots/a.png',
        { size: 10, mtimeMs: 20 },
        {
            cacheDirectory: 'C:/cache',
            fileSystem,
            sharpFactory: () => pipeline
        }
    )
    assert.equal(result, generated)
    assert.deepEqual(resizeOptions, {
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true
    })
    assert.deepEqual(webpOptions, { quality: 78 })
    assert.match(written.path, /\.webp$/)
    assert.equal(written.value, generated)
})
