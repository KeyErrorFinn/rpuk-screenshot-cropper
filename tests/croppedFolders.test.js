import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileCroppedFolderSummaries } from '../src/renderer/src/lib/croppedFolders.js'

test('keeps loaded images when a folder summary has not changed', () => {
    const images = [{ name: 'one.png' }, { name: 'two.png' }]
    const result = reconcileCroppedFolderSummaries(
        { dated: { loaded: true, uploadedCount: 0, contentSignature: 'same', images } },
        [{ folderName: 'dated', imageCount: 2, uploadedCount: 1, contentSignature: 'same' }]
    )

    assert.equal(result.dated.loaded, true)
    assert.equal(result.dated.images, images)
    assert.equal(result.dated.uploadedCount, 1)
})

test('uses placeholders when the contents of a folder changed', () => {
    const result = reconcileCroppedFolderSummaries(
        {
            dated: {
                loaded: true,
                uploadedCount: 0,
                contentSignature: 'old',
                images: [{ name: 'old.png' }]
            }
        },
        [{ folderName: 'dated', imageCount: 2, uploadedCount: 0, contentSignature: 'new' }]
    )

    assert.equal(result.dated.loaded, false)
    assert.deepEqual(result.dated.images, [null, null])
})
