import test from 'node:test'
import assert from 'node:assert/strict'
import {
    combineCropAnalyses,
    suggestCropInsetsFromPixels
} from '../src/renderer/src/lib/cropAssistance.js'

test('suggests a repeated dark top band without changing the image', () => {
    const width = 100
    const height = 50
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1)
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * 4
            const value = y < 5 ? 20 : ((x * 17 + y * 11) % 220) + 30
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value
            pixels[offset + 3] = 255
        }
    const result = suggestCropInsetsFromPixels(pixels, width, height)
    assert.equal(result.top, 5)
    assert.equal(result.bottom, 0)
})

test('combines several calibration samples using stable median edges and reports confidence', () => {
    const result = combineCropAnalyses([
        { insets: { top: 35, right: 0, bottom: 52, left: 0 }, confidence: 0.9 },
        { insets: { top: 36, right: 0, bottom: 53, left: 0 }, confidence: 0.8 },
        { insets: { top: 80, right: 0, bottom: 54, left: 0 }, confidence: 0.7 }
    ])
    assert.deepEqual(result.insets, { top: 36, right: 0, bottom: 53, left: 0 })
    assert.equal(result.sampleCount, 3)
    assert.ok(result.confidence > 0 && result.confidence < 0.9)
})
