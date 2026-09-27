import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
    createImageActions,
    imageActionChannels,
    registerImageActionHandlers
} from '../src/main/imageActions.js'

const sourceRoot = process.platform === 'win32' ? 'C:\\Shots' : '/tmp/rpuk-shots'

function createDependencies({ empty = false, openError = '' } = {}) {
    const calls = { opened: [], created: [], copied: [] }
    const dependencies = {
        shell: {
            openPath: async (path) => {
                calls.opened.push(path)
                return openError
            }
        },
        nativeImage: {
            createFromPath: (path) => {
                calls.created.push(path)
                return { path, isEmpty: () => empty }
            }
        },
        clipboard: { writeImage: (image) => calls.copied.push(image) }
    }
    return { calls, dependencies }
}

test('registers all image actions for both invoke and send transports', () => {
    const handlers = new Map()
    const listeners = new Map()
    const removedHandlers = []
    const removedListeners = []
    const ipcMain = {
        handle: (channel, callback) => handlers.set(channel, callback),
        on: (channel, callback) => listeners.set(channel, callback),
        removeHandler: (channel) => removedHandlers.push(channel),
        removeAllListeners: (channel) => removedListeners.push(channel)
    }
    const { dependencies } = createDependencies()
    registerImageActionHandlers({ ipcMain, ...dependencies })
    const channels = Object.values(imageActionChannels)
    assert.deepEqual([...handlers.keys()], channels)
    assert.deepEqual([...listeners.keys()], channels)
    assert.deepEqual(removedHandlers, channels)
    assert.deepEqual(removedListeners, channels)
})

test('opens the requested dated cropped folder', async () => {
    const { calls, dependencies } = createDependencies()
    const actions = createImageActions(dependencies)
    assert.equal(await actions.openCroppedFolder('C:\\Exports', '16-08-26'), true)
    assert.equal(calls.opened[0], join('C:\\Exports', 'cropped', '16-08-26'))
})

test('reports a File Explorer failure', async () => {
    const { dependencies } = createDependencies({ openError: 'Folder not found' })
    assert.equal(
        await createImageActions(dependencies).openCroppedFolder('C:\\Exports', 'missing'),
        false
    )
})

test('folder opening rejects missing arguments', async () => {
    const { dependencies } = createDependencies()
    assert.equal(await createImageActions(dependencies).openCroppedFolder('', '16-08-26'), false)
})

test('copies a source image using only the filename basename', () => {
    const { calls, dependencies } = createDependencies()
    const filename = process.platform === 'win32' ? '..\\outside.png' : '../outside.png'
    assert.equal(createImageActions(dependencies).copySource(sourceRoot, filename), true)
    assert.equal(calls.created[0], join(sourceRoot, 'outside.png'))
    assert.equal(calls.copied.length, 1)
})

test('copies a cropped image from its dated folder', () => {
    const { calls, dependencies } = createDependencies()
    assert.equal(
        createImageActions(dependencies).copyCropped('C:\\Exports', '16-08-26', 'cropped_test.png'),
        true
    )
    assert.equal(calls.created[0], join('C:\\Exports', 'cropped', '16-08-26', 'cropped_test.png'))
    assert.equal(calls.copied.length, 1)
})

test('does not write an empty native image to the clipboard', () => {
    const { calls, dependencies } = createDependencies({ empty: true })
    assert.equal(createImageActions(dependencies).copySource(sourceRoot, 'test.png'), false)
    assert.equal(calls.copied.length, 0)
})
