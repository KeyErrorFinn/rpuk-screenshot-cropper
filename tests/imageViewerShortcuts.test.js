import test from 'node:test'
import assert from 'node:assert/strict'
import { getImageViewerAction } from '../src/renderer/src/lib/imageViewerShortcuts.js'

test('maps image viewer navigation keys', () => {
    assert.equal(getImageViewerAction({ key: 'ArrowLeft', ctrlKey: false }), 'previous')
    assert.equal(getImageViewerAction({ key: 'ArrowRight', ctrlKey: false }), 'next')
})

test('maps Space to image selection', () => {
    assert.equal(getImageViewerAction({ key: ' ', ctrlKey: false }), 'select')
})

test('maps Ctrl+C regardless of C casing', () => {
    assert.equal(getImageViewerAction({ key: 'c', ctrlKey: true }), 'copy')
    assert.equal(getImageViewerAction({ key: 'C', ctrlKey: true }), 'copy')
})

test('maps Escape to close and ignores unrelated keys', () => {
    assert.equal(getImageViewerAction({ key: 'Escape', ctrlKey: false }), 'close')
    assert.equal(getImageViewerAction({ key: 'Enter', ctrlKey: false }), null)
})
