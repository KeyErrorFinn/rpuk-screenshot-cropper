import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createFolderMonitor } from '../src/main/folderMonitor.js'

test('watcher emits exact changed paths and can pause without leaving handles open', () => {
    const sends = []
    const invalidated = []
    const watchers = []
    const watch = (path, _options, callback) => {
        const watcher = new EventEmitter()
        watcher.path = path
        watcher.callback = callback
        watcher.closed = false
        watcher.close = () => {
            watcher.closed = true
        }
        watchers.push(watcher)
        return watcher
    }
    const monitor = createFolderMonitor({
        watch,
        getSettings: () => ({
            screenshotFolderPath: 'C:/source',
            destinationFolderPath: 'C:/output'
        }),
        send: (channel, payload) => sends.push({ channel, payload }),
        invalidate: (path) => invalidated.push(path),
        logger: { error() {} },
        reconciliationMs: 60_000
    })
    monitor.start()
    watchers[0].callback('rename', 'shot.png')
    assert.match(invalidated[0], /source[\\/]shot\.png$/)
    assert.deepEqual(sends[0], { channel: 'images:source-changed', payload: { path: 'shot.png' } })
    monitor.setPaused(true)
    assert.equal(
        watchers.every((watcher) => watcher.closed),
        true
    )
    assert.equal(monitor.paused, true)
    monitor.stop()
})
