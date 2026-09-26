import assert from 'node:assert/strict'
import test from 'node:test'
import { isSupportedImage, isUnsupportedImage } from '../src/main/imageFileSupport.js'

test('recognises the image formats handled by the cropper', () => {
    for (const filename of ['shot.png', 'shot.JPG', 'shot.jpeg', 'shot.webp']) {
        assert.equal(isSupportedImage(filename), true)
    }
})

test('classifies recognisable unsupported image formats without treating sidecar files as images', () => {
    for (const filename of ['shot.bmp', 'shot.gif', 'shot.heic', 'shot.tiff']) {
        assert.equal(isUnsupportedImage(filename), true)
    }
    for (const filename of ['desktop.ini', 'Thumbs.db', 'notes.txt', 'data.json', 'capture.tmp']) {
        assert.equal(isUnsupportedImage(filename), false)
    }
})
