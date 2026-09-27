import test from 'node:test'
import assert from 'node:assert/strict'
import {
    mkdtemp,
    mkdir,
    readFile,
    rm,
    stat,
    writeFile,
    copyFile,
    unlink,
    access,
    readdir
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chooseAvailablePath, createCropTransactionService } from '../src/main/cropTransaction.js'

function memoryStore() {
    const values = new Map()
    return {
        get: (key, fallback) => (values.has(key) ? structuredClone(values.get(key)) : fallback),
        set: (key, value) => values.set(key, structuredClone(value))
    }
}

function fakeSharp(filePath) {
    return {
        metadata: async () => ({ width: 1920, height: 1080 }),
        extract: () => ({ toFile: async (output) => writeFile(output, await readFile(filePath)) })
    }
}

function service(root, store, trash = (path) => rm(path, { force: true }), overrides = {}) {
    return createCropTransactionService({
        fileSystem: {
            mkdir,
            readFile,
            writeFile,
            copyFile,
            unlink,
            access,
            stat,
            rm,
            readdir,
            ...overrides.fileSystem
        },
        sharpFactory: overrides.sharpFactory || fakeSharp,
        store,
        userDataPath: join(root, 'data'),
        trashItem: trash,
        getCropInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
        getCropRegion: (width, height) => ({ left: 0, top: 0, width, height }),
        mapConcurrent: async (items, _limit, mapper) => Promise.all(items.map(mapper))
    })
}

test('chooses a non-destructive output name when the desired file exists', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crop-name-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const desired = join(root, 'cropped_shot.png')
    await writeFile(desired, 'old')
    assert.equal(await chooseAvailablePath({ access }, desired), join(root, 'cropped_shot (2).png'))
})

test('reports the specific image and removes partial backups when staging fails', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crop-stage-failure-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const input = join(root, 'input')
    await mkdir(input, { recursive: true })
    await writeFile(join(input, 'shot.png'), 'image')
    const store = memoryStore()
    const failingSharp = (filePath) => ({
        metadata: async () => ({ width: 1920, height: 1080 }),
        extract: () => ({
            toFile: async () => {
                throw new Error(`Could not encode ${filePath}`)
            }
        })
    })
    const result = await service(root, store, undefined, { sharpFactory: failingSharp }).crop({
        inputPath: input,
        outputPath: join(root, 'output'),
        keepOriginalImage: false,
        filenames: ['shot.png'],
        cropConfiguration: {}
    })
    assert.equal(result.success, false)
    assert.equal(result.errors[0].filename, 'shot.png')
    assert.match(result.errors[0].error, /Could not encode/)
    await assert.rejects(access(join(root, 'data', 'crop-undo', result.batchId)))
    assert.equal(await readFile(join(input, 'shot.png'), 'utf8'), 'image')
})

test('recovers an interrupted commit by restoring source and removing committed output', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crop-recovery-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const sourcePath = join(root, 'input', 'shot.png')
    const backupPath = join(root, 'data', 'crop-undo', 'batch-1', 'shot.png')
    const outputPath = join(root, 'output', 'cropped', '14-09-26', 'cropped_shot.png')
    await mkdir(join(root, 'input'), { recursive: true })
    await mkdir(join(root, 'data', 'crop-undo', 'batch-1'), { recursive: true })
    await mkdir(join(root, 'output', 'cropped', '14-09-26'), { recursive: true })
    await writeFile(backupPath, 'original')
    await writeFile(outputPath, 'partial output')
    const store = memoryStore()
    store.set('cropBatches', [
        {
            id: 'batch-1',
            createdAt: new Date().toISOString(),
            status: 'committing',
            errors: [],
            items: [
                {
                    filename: 'shot.png',
                    sourcePath,
                    backupPath,
                    committedOutputs: [outputPath],
                    outputs: []
                }
            ]
        }
    ])
    const result = await service(root, store).recover()
    assert.deepEqual(result.recovered, ['batch-1'])
    assert.equal(await readFile(sourcePath, 'utf8'), 'original')
    await assert.rejects(access(outputPath))
    assert.equal(store.get('cropBatches', [])[0].status, 'recovered')
})

test('commits and can undo a crop batch without overwriting existing output', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crop-transaction-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const input = join(root, 'input')
    const output = join(root, 'output')
    await mkdir(input, { recursive: true })
    await mkdir(join(output, 'cropped', '14-09-26'), { recursive: true })
    await writeFile(join(input, 'shot.png'), 'new-image')
    const sourceStats = await stat(join(input, 'shot.png'))
    const expectedFolder = `${String(sourceStats.mtime.getDate()).padStart(2, '0')}-${String(sourceStats.mtime.getMonth() + 1).padStart(2, '0')}-${String(sourceStats.mtime.getFullYear()).slice(2)}`
    await mkdir(join(output, 'cropped', expectedFolder), { recursive: true })
    await writeFile(join(output, 'cropped', expectedFolder, 'cropped_shot.png'), 'old-image')
    const store = memoryStore()
    const cropper = service(root, store)
    const result = await cropper.crop({
        inputPath: input,
        outputPath: output,
        keepOriginalImage: false,
        filenames: ['shot.png'],
        cropConfiguration: {}
    })
    assert.equal(result.success, true)
    assert.equal(
        await readFile(join(output, 'cropped', expectedFolder, 'cropped_shot.png'), 'utf8'),
        'old-image'
    )
    assert.equal(result.croppedImages[0].name, 'cropped_shot (2).png')
    await assert.rejects(access(join(input, 'shot.png')))
    const undoResult = await cropper.undo(result.batchId)
    assert.equal(undoResult.success, true)
    assert.deepEqual(undoResult.restoredImages, [{ name: 'shot.png' }])
    assert.equal(await readFile(join(input, 'shot.png'), 'utf8'), 'new-image')
    await assert.rejects(access(join(output, 'cropped', expectedFolder, 'cropped_shot (2).png')))
})

test('undo refuses to overwrite a new file at the original source path', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crop-conflict-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const input = join(root, 'input')
    const output = join(root, 'output')
    await mkdir(input, { recursive: true })
    await writeFile(join(input, 'shot.png'), 'original')
    const cropper = service(root, memoryStore())
    const result = await cropper.crop({
        inputPath: input,
        outputPath: output,
        keepOriginalImage: false,
        filenames: ['shot.png'],
        cropConfiguration: {}
    })
    await writeFile(join(input, 'shot.png'), 'replacement')
    const undone = await cropper.undo(result.batchId)
    assert.equal(undone.success, false)
    assert.equal(undone.conflicts.length, 1)
    assert.equal(await readFile(join(input, 'shot.png'), 'utf8'), 'replacement')
})
