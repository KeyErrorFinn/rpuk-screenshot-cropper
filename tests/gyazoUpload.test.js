import assert from 'node:assert/strict'
import test from 'node:test'
import {
    uploadImageToGyazo,
    uploadImageWithRetry,
    uploadSelectedToGyazo
} from '../src/main/gyazoUpload.js'

test('uploads an image to Gyazo as multipart form data', async () => {
    let request
    const result = await uploadImageToGyazo(
        'C:/output/cropped/13-09-26/image.png',
        'secret-token',
        {
            fileSystem: { readFile: async () => Buffer.from('image bytes') },
            fetchFunction: async (url, options) => {
                request = { url, options }
                return {
                    ok: true,
                    json: async () => ({
                        image_id: 'abc',
                        permalink_url: 'https://gyazo.com/abc',
                        url: 'https://i.gyazo.com/abc.png'
                    })
                }
            }
        }
    )

    assert.equal(request.url, 'https://upload.gyazo.com/api/upload')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers.Authorization, 'Bearer secret-token')
    assert.equal(request.options.body.get('access_token'), null)
    assert.equal(request.options.body.get('app'), 'RPUK Screenshot Cropper')
    assert.equal(request.options.body.get('imagedata').name, 'image.png')
    assert.equal(request.options.body.get('imagedata').type, 'image/png')
    assert.equal(result.image_id, 'abc')
    assert.match(result.url, /\.png$/)
})

test('uploads selected images and reports individual failures', async () => {
    const result = await uploadSelectedToGyazo(
        'C:/output',
        'token',
        [
            { folder: '13-09-26', name: 'good.png' },
            { folder: '13-09-26', name: 'bad.png' }
        ],
        {
            fileSystem: { readFile: async (path) => Buffer.from(path) },
            fetchFunction: async (_url, { body }) => {
                const filename = body.get('imagedata').name
                if (filename === 'bad.png')
                    return { ok: false, status: 401, text: async () => 'Unauthorized' }
                return {
                    ok: true,
                    json: async () => ({
                        permalink_url: 'https://gyazo.com/good',
                        url: 'https://i.gyazo.com/good.png'
                    })
                }
            }
        }
    )

    assert.equal(result.uploaded.length, 1)
    assert.equal(result.failed.length, 1)
    assert.equal(result.uploaded[0].folder, '13-09-26')
    assert.equal(result.uploaded[0].filename, 'good.png')
    assert.equal(result.uploaded[0].permalink_url, 'https://gyazo.com/good')
    assert.equal(result.uploaded[0].url, 'https://i.gyazo.com/good.png')
    assert.equal(
        result.failed[0].error,
        'Gyazo rejected the access token. Create a new token and save it in Settings.'
    )
})

test('does not upload without a token or selection', async () => {
    const result = await uploadSelectedToGyazo('C:/output', '', [], {})
    assert.deepEqual(result, { uploaded: [], failed: [] })
})

test('reports aggregate progress while concurrent uploads finish', async () => {
    const progress = []
    await uploadSelectedToGyazo(
        'C:/output',
        'token',
        [
            { folder: '13-09-26', name: 'one.png' },
            { folder: '13-09-26', name: 'two.png' }
        ],
        {
            fileSystem: { readFile: async (path) => Buffer.from(path) },
            fetchFunction: async () => ({
                ok: true,
                json: async () => ({ url: 'https://i.gyazo.com/image.png' })
            }),
            onProgress: (value) => progress.push(value)
        }
    )
    assert.deepEqual(progress.sort(), [0.5, 1])
})

test('retries temporary Gyazo failures but not authentication errors', async () => {
    let attempts = 0
    const result = await uploadImageWithRetry('C:/output/image.png', 'token', {
        fileSystem: { readFile: async () => Buffer.from('image') },
        fetchFunction: async () => {
            attempts += 1
            return attempts < 3
                ? { ok: false, status: 503, text: async () => 'Unavailable' }
                : { ok: true, json: async () => ({ image_id: 'done' }) }
        },
        delayFunction: async () => {}
    })
    assert.equal(attempts, 3)
    assert.equal(result.image_id, 'done')

    attempts = 0
    await assert.rejects(
        () =>
            uploadImageWithRetry('C:/output/image.png', 'token', {
                fileSystem: { readFile: async () => Buffer.from('image') },
                fetchFunction: async () => {
                    attempts += 1
                    return { ok: false, status: 401, text: async () => 'Unauthorized' }
                },
                delayFunction: async () => {}
            }),
        /Gyazo rejected the access token/
    )
    assert.equal(attempts, 1)
})

test('stops starting queued uploads after Gyazo rejects the token', async () => {
    let attempts = 0
    const result = await uploadSelectedToGyazo(
        'C:/output',
        'bad-token',
        [
            { folder: '13-09-26', name: 'one.png' },
            { folder: '13-09-26', name: 'two.png' },
            { folder: '13-09-26', name: 'three.png' }
        ],
        {
            fileSystem: { readFile: async () => Buffer.from('image') },
            fetchFunction: async () => {
                attempts += 1
                return {
                    ok: false,
                    status: 401,
                    text: async () => '{"message":"You are not authorized."}'
                }
            }
        }
    )

    assert.equal(attempts, 2)
    assert.match(result.authError, /Gyazo rejected the access token/)
    assert.equal(result.notAttempted, 1)
    assert.equal(result.failed.length, 3)
})

test('does not retry a cancelled upload', async () => {
    let attempts = 0
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
        () =>
            uploadImageWithRetry('C:/output/image.png', 'token', {
                fileSystem: { readFile: async () => Buffer.from('image') },
                fetchFunction: async () => {
                    attempts += 1
                    throw new DOMException('This operation was aborted', 'AbortError')
                },
                signal: controller.signal,
                delayFunction: async () => {}
            }),
        /aborted/
    )
    assert.equal(attempts, 1)
})
