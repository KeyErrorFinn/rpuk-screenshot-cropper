import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ActivityCenter from '../../src/renderer/src/components/ActivityCenter.jsx'
import BatchHistory from '../../src/renderer/src/components/BatchHistory.jsx'

describe('activity centre', () => {
    test('shows operation details and clears completed work', () => {
        const clear = vi.fn()
        const retry = vi.fn()
        const activity = {
            id: '1',
            title: 'Cropping 2 images',
            status: 'failed',
            detail: 'shot.png: disk full',
            retry: 'crop-selected',
            createdAt: new Date().toISOString()
        }
        render(
            <ActivityCenter
                open
                onClose={() => {}}
                onClear={clear}
                onRetry={retry}
                activities={[activity]}
            />
        )
        expect(screen.getByRole('dialog', { name: 'Activity' })).toHaveAttribute(
            'aria-modal',
            'true'
        )
        expect(screen.getByText('Cropping 2 images')).toBeInTheDocument()
        expect(screen.getByText('shot.png: disk full')).toBeInTheDocument()
        fireEvent.click(screen.getByText('Clear finished'))
        expect(clear).toHaveBeenCalledOnce()
        fireEvent.click(screen.getByText('Retry'))
        expect(retry).toHaveBeenCalledWith(activity)
    })
})

describe('crop history', () => {
    beforeEach(() => {
        window.api = {
            getCropBatches: vi.fn().mockResolvedValue([
                {
                    id: 'batch-1',
                    createdAt: new Date().toISOString(),
                    status: 'complete',
                    itemCount: 1,
                    files: ['shot.png'],
                    errors: []
                },
                {
                    id: 'batch-0',
                    createdAt: new Date().toISOString(),
                    status: 'undone',
                    itemCount: 1,
                    files: ['old-shot.png'],
                    errors: []
                }
            ]),
            undoCropBatch: vi
                .fn()
                .mockResolvedValue({ success: true, restoredImages: [{ name: 'shot.png' }] })
        }
    })
    test('loads history and restores a chosen batch', async () => {
        const restored = vi.fn()
        render(<BatchHistory open onClose={() => {}} onRestored={restored} />)
        expect(screen.getByRole('dialog', { name: 'Crop history' })).toHaveAttribute(
            'aria-modal',
            'true'
        )
        expect(await screen.findByText('shot.png')).toBeInTheDocument()
        expect(screen.queryByText('old-shot.png')).not.toBeInTheDocument()
        fireEvent.click(screen.getByText('Undo batch'))
        await waitFor(() => expect(window.api.undoCropBatch).toHaveBeenCalledWith('batch-1'))
        await waitFor(() => expect(restored).toHaveBeenCalled())
        expect(screen.queryByText('shot.png')).not.toBeInTheDocument()
    })
})
