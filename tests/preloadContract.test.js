import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { IPC_CHANNELS } from '../src/shared/ipcContracts.js'

test('preload uses one-way send for image actions', async () => {
    const source = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')
    for (const key of ['openCroppedFolder', 'copySource', 'copyCropped'])
        assert.match(source, new RegExp(`ipcRenderer\\.send\\(IPC_CHANNELS\\.${key}`))
    for (const channel of [
        IPC_CHANNELS.openCroppedFolder,
        IPC_CHANNELS.copySource,
        IPC_CHANNELS.copyCropped
    ])
        assert.doesNotMatch(source, new RegExp(`ipcRenderer\\.invoke\\(["']${channel}`))
})

test('preload invokes the Gyazo upload handler', async () => {
    const source = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')
    assert.match(source, /ipcRenderer\.invoke\(IPC_CHANNELS\.uploadGyazo/)
    assert.match(source, /ipcRenderer\.send\(IPC_CHANNELS\.copyText/)
})

test('preload exposes the packaged application version', async () => {
    const source = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')
    assert.match(
        source,
        /getAppVersion:\s*\(\)\s*=>\s*ipcRenderer\.invoke\(IPC_CHANNELS\.getAppVersion\)/
    )
})

test('preload exposes recovery, deletion, favourite, and lazy thumbnail handlers', async () => {
    const source = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')
    for (const key of [
        'undoLastCrop',
        'deleteCropped',
        'toggleFavourite',
        'getSourceThumbnail',
        'getCroppedThumbnail'
    ])
        assert.match(source, new RegExp(`ipcRenderer\\.invoke\\(IPC_CHANNELS\\.${key}`))
    assert.match(source, /ipcRenderer\.send\(IPC_CHANNELS\.windowFullscreen/)
})

test('preload exposes removable folder monitoring listeners', async () => {
    const source = await readFile(new URL('../src/preload/index.js', import.meta.url), 'utf8')
    for (const key of ['sourceChanged', 'croppedChanged', 'imageWarning', 'settingsChanged']) {
        assert.match(source, new RegExp(`ipcRenderer\\.on\\(IPC_CHANNELS\\.${key}`))
        assert.match(source, new RegExp(`ipcRenderer\\.removeListener\\(IPC_CHANNELS\\.${key}`))
    }
})

test('shared contract names every channel exposed by the preload', () => {
    for (const value of Object.values(IPC_CHANNELS)) assert.equal(typeof value, 'string')
    assert.equal(new Set(Object.values(IPC_CHANNELS)).size, Object.values(IPC_CHANNELS).length)
})
