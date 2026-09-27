import test from 'node:test'
import assert from 'node:assert/strict'
import { createDirectoryCatalog } from '../src/main/directoryCatalog.js'

test('directory listings stay cached until the changed directory is invalidated', async () => {
    let reads = 0
    const catalog = createDirectoryCatalog({
        fileSystem: {
            readdir: async () => {
                reads += 1
                return [{ name: `read-${reads}` }]
            }
        }
    })
    const first = await catalog.list('C:/screenshots')
    const second = await catalog.list('C:/screenshots')
    assert.equal(first, second)
    assert.equal(reads, 1)
    catalog.invalidate('C:/screenshots/new.png')
    await catalog.list('C:/screenshots')
    assert.equal(reads, 2)
})
