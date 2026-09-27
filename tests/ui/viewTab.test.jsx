import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import ViewTab from '../../src/renderer/src/components/tabs/ViewTab/index.jsx'

const defaults = {
    loadFolderImages: vi.fn(),
    openedFolders: [],
    setOpenedFolders: vi.fn(),
    selectedImages: {},
    setSelectedImages: vi.fn(),
    refreshImages: vi.fn(),
    copyImage: vi.fn(),
    copyGyazoLink: vi.fn(),
    toggleFavourite: vi.fn(),
    setImageTags: vi.fn(),
    deleteImages: vi.fn(),
    loadFullImage: vi.fn(),
    openFolder: vi.fn(),
    uploadSelected: vi.fn(),
    cancelUpload: vi.fn(),
    uploading: false,
    refreshing: false,
    newFolders: {},
    clearNewFolder: vi.fn(),
    galleryColumns: 4,
    setGalleryColumns: vi.fn(),
    setFilter: vi.fn()
}

beforeEach(() => {
    vi.clearAllMocks()
    window.api = { setFullscreen: vi.fn() }
})

test('view filter hides folders without a matching uploaded image', () => {
    render(
        <ViewTab
            {...defaults}
            filter="uploaded"
            croppedFolders={{
                '14-09-26': {
                    images: [null],
                    imageCount: 1,
                    uploadedCount: 0,
                    favouriteCount: 0,
                    resolutions: ['1920x1080'],
                    searchText: 'shot.png'
                }
            }}
        />
    )
    expect(screen.getByText('No screenshots match this filter')).toBeInTheDocument()
    expect(screen.queryByText('14-09-26')).not.toBeInTheDocument()
})

test('view toolbar exposes search, library filters and expand all without a size filter', () => {
    render(<ViewTab {...defaults} filter="all" croppedFolders={{}} />)
    expect(screen.getByPlaceholderText('Search names or tags')).toBeEnabled()
    expect(screen.queryByRole('combobox', { name: 'Filter by resolution' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand all visible folders' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Pinned' }))
    expect(defaults.setFilter).toHaveBeenCalledWith('favourite')
})

test('expand all opens every visible folder and refresh exposes its busy state', () => {
    const setOpenedFolders = vi.fn()
    const folderData = {
        '14-09-26': {
            loaded: true,
            images: [],
            imageCount: 0,
            uploadedCount: 0,
            favouriteCount: 0,
            searchText: ''
        }
    }
    const { rerender } = render(
        <ViewTab
            {...defaults}
            refreshing
            setOpenedFolders={setOpenedFolders}
            filter="all"
            croppedFolders={folderData}
        />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand all visible folders' }))
    const update = setOpenedFolders.mock.calls[0][0]
    expect(update([])).toEqual(['14-09-26'])
    expect(screen.getByRole('button', { name: 'Refreshing cropped screenshots' })).toBeDisabled()
    rerender(
        <ViewTab
            {...defaults}
            openedFolders={['14-09-26']}
            setOpenedFolders={setOpenedFolders}
            filter="all"
            croppedFolders={folderData}
        />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all visible folders' }))
    expect(setOpenedFolders.mock.calls[1][0](['14-09-26'])).toEqual([])
})

test('opening many folders starts at most two metadata loads at once', async () => {
    const loadFolderImages = vi.fn(() => new Promise(() => {}))
    const placeholder = (name) => ({
        loaded: false,
        images: [null],
        imageCount: 1,
        uploadedCount: 0,
        favouriteCount: 0,
        searchText: name
    })
    render(
        <ViewTab
            {...defaults}
            loadFolderImages={loadFolderImages}
            openedFolders={['one', 'two', 'three']}
            filter="all"
            croppedFolders={{
                one: placeholder('one'),
                two: placeholder('two'),
                three: placeholder('three')
            }}
        />
    )
    await waitFor(() => expect(loadFolderImages).toHaveBeenCalledTimes(2))
})
