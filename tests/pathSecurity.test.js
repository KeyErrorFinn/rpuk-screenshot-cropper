import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
    configuredCroppedPath,
    configuredSourcePath,
    requireChildName,
    requireCompatibleFolderRoots,
    requireConfiguredRoot,
    requirePathInside
} from '../src/main/pathSecurity.js'

const sourceRoot = process.platform === 'win32' ? 'C:\\Screenshots' : '/tmp/rpuk-screenshots'
const destinationRoot = process.platform === 'win32' ? 'C:\\Cropped' : '/tmp/rpuk-cropped'
const otherRoot = process.platform === 'win32' ? 'D:\\Cropped' : '/tmp/rpuk-other-cropped'
const settings = { screenshotFolderPath: sourceRoot, destinationFolderPath: destinationRoot }

test('accepts the configured roots and direct image children', () => {
    assert.equal(
        requireConfiguredRoot(sourceRoot, settings.screenshotFolderPath, 'Screenshot'),
        sourceRoot
    )
    assert.match(
        configuredSourcePath(settings, sourceRoot, 'shot.png'),
        /Screenshots[\\/]shot\.png$|rpuk-screenshots[\\/]shot\.png$/
    )
    assert.match(
        configuredCroppedPath(settings, destinationRoot, '14-09-26', 'cropped_shot.png'),
        /cropped[\\/]14-09-26[\\/]cropped_shot\.png$/
    )
})

test('rejects roots that do not match saved settings', () => {
    const elsewhere = process.platform === 'win32' ? 'C:\\Elsewhere' : '/tmp/rpuk-elsewhere'
    assert.throws(
        () => requireConfiguredRoot(elsewhere, settings.destinationFolderPath, 'Destination'),
        { code: 'PATH_NOT_ALLOWED' }
    )
})

test('rejects traversal and nested renderer path segments', () => {
    for (const value of ['..', '../secret', '..\\secret', 'folder/file', 'folder\\file']) {
        assert.throws(() => requireChildName(value))
    }
})

test('rejects candidates outside an approved root', () => {
    assert.throws(() =>
        requirePathInside(destinationRoot, join(destinationRoot, '..', 'Windows', 'secret.png'))
    )
})

test('allows screenshots and managed cropped output to share the same root', () => {
    assert.deepEqual(requireCompatibleFolderRoots(sourceRoot, sourceRoot), {
        source: sourceRoot,
        destination: sourceRoot
    })
})

test('allows separate roots but rejects distinct parent and child roots', () => {
    assert.doesNotThrow(() => requireCompatibleFolderRoots(sourceRoot, otherRoot))
    assert.throws(() => requireCompatibleFolderRoots(sourceRoot, join(sourceRoot, 'Exports')), {
        code: 'INVALID_SETTINGS_PATHS'
    })
    assert.throws(() => requireCompatibleFolderRoots(join(sourceRoot, 'Incoming'), sourceRoot), {
        code: 'INVALID_SETTINGS_PATHS'
    })
})
