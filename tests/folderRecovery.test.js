import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rename, rm, stat, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findMovedFolder, getFolderIdentity } from '../src/main/folderRecovery.js'

test('finds a configured folder renamed within its surrounding workspace', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'folder-recovery-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const original = join(root, 'screenshots')
    const moved = join(root, 'renamed-screenshots')
    await mkdir(original)
    const identity = await getFolderIdentity({ stat }, original)
    await rename(original, moved)
    assert.equal(await findMovedFolder({ stat, readdir }, original, identity), moved)
})
