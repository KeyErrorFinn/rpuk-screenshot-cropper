import test from 'node:test'
import assert from 'node:assert/strict'
import { formatFolderDate } from '../src/renderer/src/lib/folderDate.js'

test('formats a stored folder date as a full British date', () => {
    assert.equal(formatFolderDate('16-08-26'), 'Sunday, 16 August 2026')
})

test('keeps an unrelated folder name unchanged', () => {
    assert.equal(formatFolderDate('screenshots-old'), 'screenshots-old')
})

test('keeps an impossible calendar date unchanged', () => {
    assert.equal(formatFolderDate('31-02-26'), '31-02-26')
})
