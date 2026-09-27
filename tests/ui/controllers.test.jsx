import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { useActivityCenter } from '../../src/renderer/src/hooks/useActivityCenter.js'
import { useWorkspacePreferences } from '../../src/renderer/src/hooks/useWorkspacePreferences.js'

beforeEach(() => {
    window.api = {
        getPreference: vi.fn().mockImplementation((key) =>
            Promise.resolve(
                key === 'workspacePreferences'
                    ? {
                          activeTab: 'view',
                          galleryColumns: 6,
                          viewFilter: 'favourite',
                          openedFolders: ['14-09-26']
                      }
                    : []
            )
        ),
        setPreference: vi.fn().mockResolvedValue(true),
        onOperationProgress: vi.fn().mockReturnValue(() => {})
    }
})

test('workspace controller restores and persists the complete gallery workspace', async () => {
    const { result } = renderHook(() => useWorkspacePreferences())
    await waitFor(() => expect(result.current.activeTab).toBe('view'))
    expect(result.current.galleryColumns).toBe(6)
    expect(result.current.viewFilter).toBe('favourite')
    expect(result.current.openedFolders).toEqual(['14-09-26'])
    act(() => result.current.setGalleryColumns(3))
    await waitFor(() =>
        expect(window.api.setPreference).toHaveBeenCalledWith(
            'workspacePreferences',
            expect.objectContaining({ galleryColumns: 3 })
        )
    )
})

test('activity controller records failures and runs the exact in-session retry', async () => {
    const retry = vi.fn()
    const { result } = renderHook(() => useActivityCenter())
    await waitFor(() => expect(window.api.getPreference).toHaveBeenCalledWith('activityHistory'))
    let id
    act(() => {
        id = result.current.begin('Deleting image', undefined, 'session', retry)
    })
    act(() => result.current.finish(id, 'failed', 'File is locked'))
    expect(result.current.activities[0]).toMatchObject({
        status: 'failed',
        detail: 'File is locked'
    })
    act(() => expect(result.current.runRetry(result.current.activities[0])).toBe(true))
    expect(retry).toHaveBeenCalledOnce()
})
