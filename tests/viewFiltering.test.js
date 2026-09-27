import test from 'node:test'
import assert from 'node:assert/strict'
import {
    folderMatchesViewFilter,
    imageMatchesViewFilter
} from '../src/renderer/src/lib/viewFiltering.js'

const uploaded = {
    name: 'evidence.png',
    width: 2560,
    height: 1440,
    gyazoUrl: 'https://example/image.png',
    favourite: true,
    tags: ['report']
}
const plain = {
    name: 'street.png',
    width: 1920,
    height: 1080,
    gyazoUrl: null,
    favourite: false,
    tags: []
}

test('view image filters compose search and library state', () => {
    assert.equal(imageMatchesViewFilter(uploaded, { filter: 'uploaded', query: 'report' }), true)
    assert.equal(imageMatchesViewFilter(plain, { filter: 'uploaded' }), false)
    assert.equal(imageMatchesViewFilter(plain, { filter: 'not-uploaded' }), true)
    assert.equal(imageMatchesViewFilter(plain, { filter: 'new', isNew: true }), true)
    assert.equal(imageMatchesViewFilter(uploaded, { filter: 'new', isNew: false }), false)
})

test('folder summaries disappear when no image can match', () => {
    const summary = {
        imageCount: 3,
        uploadedCount: 0,
        favouriteCount: 0,
        searchText: 'street.png',
        resolutions: ['1920x1080']
    }
    assert.equal(folderMatchesViewFilter('14-09-26', summary, { filter: 'uploaded' }), false)
    assert.equal(
        folderMatchesViewFilter('14-09-26', summary, { filter: 'not-uploaded', query: 'street' }),
        true
    )
    assert.equal(
        folderMatchesViewFilter('14-09-26', summary, {
            filter: 'new',
            newFolders: { '14-09-26': { 'street.png': true } }
        }),
        true
    )
    assert.equal(
        folderMatchesViewFilter(
            '14-09-26',
            { ...summary, loaded: true, images: [{ ...plain, favourite: true }] },
            { filter: 'favourite' }
        ),
        true
    )
    assert.equal(
        folderMatchesViewFilter(
            '14-09-26',
            { ...summary, loaded: true, images: [plain] },
            { filter: 'favourite' }
        ),
        false
    )
})
