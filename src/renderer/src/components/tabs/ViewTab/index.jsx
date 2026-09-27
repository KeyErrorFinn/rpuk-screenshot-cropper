/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    CheckCheck,
    ChevronDown,
    ChevronsDown,
    ChevronsUp,
    FolderOpen,
    LoaderCircle,
    RefreshCw,
    Search,
    Tags,
    Trash2,
    Upload
} from 'lucide-react'
import ViewImage from './ViewImage'
import { getImageSelectionId } from '@renderer/lib/selection'
import ImageDisplay, { openDisplayImage } from '@components/tabs/ImageDisplay'
import { formatFolderDate } from '@renderer/lib/folderDate'
import { countSelectedImages } from '@renderer/lib/selection'
import GalleryZoom from '@components/GalleryZoom'
import { folderMatchesViewFilter, imageMatchesViewFilter } from '@renderer/lib/viewFiltering'
import VirtualGallery from '@components/VirtualGallery'

const ViewTab = ({
    croppedFolders,
    loadFolderImages,
    openedFolders,
    setOpenedFolders,
    selectedImages,
    setSelectedImages,
    refreshImages,
    refreshing,
    copyImage,
    copyGyazoLink,
    toggleFavourite,
    setImageTags,
    deleteImages,
    loadFullImage,
    openFolder,
    uploadSelected,
    cancelUpload,
    uploading,
    newFolders,
    clearNewFolder,
    galleryColumns,
    setGalleryColumns,
    filter,
    setFilter
}) => {
    const [displayOpen, setDisplayOpen] = useState(false)
    const [displayImage, setDisplayImage] = useState({ folder: null, index: null })
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [query, setQuery] = useState('')
    const [tagEditor, setTagEditor] = useState(null)
    const [tagDraft, setTagDraft] = useState('')
    const loadingFolders = useRef(new Set())
    const queuedFolders = useRef(new Set())
    const folderLoadQueue = useRef([])
    const activeFolderLoads = useRef(0)
    const openedFoldersRef = useRef(openedFolders)
    const croppedFoldersRef = useRef(croppedFolders)
    const loadFolderImagesRef = useRef(loadFolderImages)
    openedFoldersRef.current = openedFolders
    croppedFoldersRef.current = croppedFolders
    loadFolderImagesRef.current = loadFolderImages
    useEffect(() => {
        setSelectedImages({})
    }, [filter, setSelectedImages])
    const toggleSelected = useCallback(
        (event, folder, index) => {
            event?.stopPropagation()
            const image = croppedFolders[folder]?.images[index]
            const id = getImageSelectionId(image)
            if (!id) return
            setSelectedImages((previous) => ({
                ...previous,
                [folder]: { ...(previous[folder] || {}), [id]: !previous[folder]?.[id] }
            }))
        },
        [croppedFolders, setSelectedImages]
    )
    const openDisplay = useCallback(
        (event, folder, index) =>
            openDisplayImage(setDisplayOpen, setDisplayImage, event, { folder, index }),
        []
    )
    const toggleFolder = (folder) => {
        const isOpen = openedFolders.includes(folder)
        if (isOpen) clearNewFolder(folder)
        setOpenedFolders(
            isOpen ? openedFolders.filter((value) => value !== folder) : [...openedFolders, folder]
        )
    }

    const pumpFolderLoads = useCallback(() => {
        while (activeFolderLoads.current < 2 && folderLoadQueue.current.length) {
            const folder = folderLoadQueue.current.shift()
            queuedFolders.current.delete(folder)
            const data = croppedFoldersRef.current[folder]
            if (
                !openedFoldersRef.current.includes(folder) ||
                !data ||
                data.loaded ||
                loadingFolders.current.has(folder)
            )
                continue
            activeFolderLoads.current += 1
            loadingFolders.current.add(folder)
            Promise.resolve()
                .then(() => loadFolderImagesRef.current(folder))
                .catch(() => {})
                .finally(() => {
                    activeFolderLoads.current -= 1
                    loadingFolders.current.delete(folder)
                    pumpFolderLoads()
                })
        }
    }, [])

    useEffect(() => {
        openedFolders.forEach((folder) => {
            const data = croppedFolders[folder]
            if (
                data &&
                !data.loaded &&
                data.images.every((image) => image === null) &&
                !loadingFolders.current.has(folder) &&
                !queuedFolders.current.has(folder)
            ) {
                queuedFolders.current.add(folder)
                folderLoadQueue.current.push(folder)
            }
        })
        pumpFolderLoads()
    }, [croppedFolders, openedFolders, pumpFolderLoads])

    const toggleFolderSelection = async (event, folder, data) => {
        event.stopPropagation()
        const images = data.loaded ? data.images : await loadFolderImages(folder)
        if (!images) return
        const matchingIds = images.flatMap((image) => {
            const matches = imageMatchesViewFilter(image, {
                filter,
                query,
                isNew: Boolean(newFolders[folder]?.[image.name])
            })
            const id = getImageSelectionId(image)
            return matches && id ? [id] : []
        })
        setSelectedImages((previous) => ({
            ...previous,
            [folder]: {
                ...(previous[folder] || {}),
                ...Object.fromEntries(
                    matchingIds.map((id) => [
                        id,
                        !matchingIds.every((value) => previous[folder]?.[value])
                    ])
                )
            }
        }))
    }
    const allFolders = Object.entries(croppedFolders)
    const folders = allFolders.filter(([folder, data]) =>
        folderMatchesViewFilter(folder, data, { filter, query, newFolders })
    )
    const visibleFolderNames = folders.map(([folder]) => folder)
    const allVisibleFoldersOpen =
        visibleFolderNames.length > 0 &&
        visibleFolderNames.every((folder) => openedFolders.includes(folder))
    const selectedCount = countSelectedImages(selectedImages)
    const imageMatchesFilter = useCallback(
        (image, folder) =>
            imageMatchesViewFilter(image, {
                filter,
                query,
                isNew: Boolean(newFolders[folder]?.[image?.name])
            }),
        [filter, query, newFolders]
    )
    const currentEntries = (croppedFolders[displayImage.folder]?.images || [])
        .map((image, index) => ({ image, index }))
        .filter((entry) => imageMatchesFilter(entry.image, displayImage.folder))
    const currentImages = currentEntries.map((entry) => entry.image)
    const currentDisplayPosition = Math.max(
        0,
        currentEntries.findIndex((entry) => entry.index === displayImage.index)
    )
    const selectedItems = Object.entries(selectedImages).flatMap(([folder, selection]) =>
        Object.entries(selection)
            .filter(([, selected]) => selected)
            .map(([id]) => ({
                folder,
                name: croppedFolders[folder]?.images.find(
                    (image) => getImageSelectionId(image) === id
                )?.name
            }))
            .filter((image) => image.name)
    )
    const loadDisplayedImage = useCallback(
        (image) => loadFullImage(displayImage.folder, image.name),
        [displayImage.folder, loadFullImage]
    )
    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <header className="relative h-[86px] shrink-0 px-6 py-2">
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                    <h1 className="text-sm font-semibold">Cropped screenshots</h1>
                    <p className="mt-0.5 text-[11px] text-white/45">
                        Browse completed images by date
                    </p>
                </div>
                <label className="absolute left-1/2 top-2 -translate-x-1/2">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-2.5 text-white/40"
                    />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search names or tags"
                        className="h-9 w-52 rounded-md border border-white/10 bg-[#17191d] pl-9 pr-3 text-xs outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 min-[850px]:w-64"
                    />
                </label>
                <div className="absolute right-6 top-2 hidden min-[760px]:block">
                    <GalleryZoom columns={galleryColumns} setColumns={setGalleryColumns} />
                </div>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md bg-[#17191d] p-1">
                        {[
                            ['all', 'All'],
                            ['new', 'New'],
                            ['favourite', 'Pinned'],
                            ['uploaded', 'Uploaded'],
                            ['not-uploaded', 'Not uploaded']
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setFilter(value)}
                                className={`h-6 rounded px-2.5 text-[10px] font-medium ${filter === value ? 'bg-[#34373d] text-white' : 'text-white/45 hover:text-white'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() =>
                            setOpenedFolders((previous) =>
                                allVisibleFoldersOpen
                                    ? previous.filter(
                                          (folder) => !visibleFolderNames.includes(folder)
                                      )
                                    : [...new Set([...previous, ...visibleFolderNames])]
                            )
                        }
                        disabled={!folders.length}
                        aria-label={
                            allVisibleFoldersOpen
                                ? 'Collapse all visible folders'
                                : 'Expand all visible folders'
                        }
                        title={
                            allVisibleFoldersOpen
                                ? 'Collapse all visible folders'
                                : 'Expand all visible folders'
                        }
                        className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#17191d] text-white/55 hover:bg-[#24262b] hover:text-white disabled:opacity-35"
                    >
                        {allVisibleFoldersOpen ? (
                            <ChevronsUp size={14} />
                        ) : (
                            <ChevronsDown size={14} />
                        )}
                    </button>
                </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                {folders.length === 0 ? (
                    <div className="grid h-full place-items-center text-center">
                        <div>
                            <p className="text-sm font-medium text-white/70">
                                {allFolders.length
                                    ? 'No screenshots match this filter'
                                    : 'No cropped screenshots yet'}
                            </p>
                            <p className="mt-1 text-xs text-white/35">
                                {allFolders.length
                                    ? 'Choose another filter to see more screenshots.'
                                    : 'Cropped images will be grouped here by date.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    folders.map(([folder, data]) => {
                        const isOpen = openedFolders.includes(folder)
                        const visibleImages = data.images
                            .map((image, index) => [image, index])
                            .filter(([image]) => imageMatchesFilter(image, folder))
                        const matchingCount =
                            filter === 'new'
                                ? Object.keys(newFolders[folder] || {}).length
                                : filter === 'uploaded'
                                  ? data.uploadedCount
                                  : filter === 'not-uploaded'
                                    ? data.images.length - data.uploadedCount
                                    : data.images.length
                        return (
                            <section key={folder} className="border-b border-white/10">
                                <div className="flex h-12 items-center">
                                    <button
                                        onClick={() => toggleFolder(folder)}
                                        className="flex min-w-0 flex-1 items-center text-left text-xs font-semibold text-white/90"
                                    >
                                        <span className="truncate">
                                            {formatFolderDate(folder)}{' '}
                                            <span className="font-normal text-white/35">
                                                - {folder}
                                            </span>
                                        </span>
                                        {Object.keys(newFolders[folder] || {}).length > 0 && (
                                            <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                                New · {Object.keys(newFolders[folder]).length}
                                            </span>
                                        )}
                                        <span className="ml-2 shrink-0 text-[11px] font-normal text-white/40">
                                            {matchingCount} image{matchingCount === 1 ? '' : 's'}
                                            {filter === 'all' && data.uploadedCount > 0 && (
                                                <>
                                                    {' '}
                                                    ·{' '}
                                                    <span className="text-emerald-400/80">
                                                        {data.uploadedCount} uploaded
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                    <button
                                        aria-label={`Select every visible image in ${folder}`}
                                        title="Select all matching images"
                                        onClick={(event) =>
                                            toggleFolderSelection(event, folder, data)
                                        }
                                        className="mr-1 grid size-8 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
                                    >
                                        <CheckCheck size={14} />
                                    </button>
                                    <button
                                        aria-label={`Open ${folder} in File Explorer`}
                                        title="Open folder"
                                        onClick={() => openFolder(folder)}
                                        className="mr-1 grid size-8 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
                                    >
                                        <FolderOpen size={14} />
                                    </button>
                                    <button
                                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder}`}
                                        title={`${isOpen ? 'Collapse' : 'Expand'} folder`}
                                        onClick={() => toggleFolder(folder)}
                                        className="grid size-8 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
                                    >
                                        <ChevronDown
                                            size={14}
                                            className={`transition ${isOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>
                                {isOpen && (
                                    <VirtualGallery
                                        className="mx-auto max-w-6xl pb-5"
                                        columns={galleryColumns}
                                        items={visibleImages.map(([image, index]) => ({
                                            key: getImageSelectionId(image) || index,
                                            image,
                                            index
                                        }))}
                                        renderItem={({ image, index, key }) => {
                                            const id = getImageSelectionId(image)
                                            return (
                                                <div
                                                    key={key}
                                                    role="checkbox"
                                                    aria-checked={!!selectedImages[folder]?.[id]}
                                                    tabIndex={0}
                                                    onClick={(event) =>
                                                        toggleSelected(event, folder, index)
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key === 'Enter' ||
                                                            event.key === ' '
                                                        ) {
                                                            event.preventDefault()
                                                            toggleSelected(event, folder, index)
                                                        }
                                                    }}
                                                    className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-[#17191d] transition ${selectedImages[folder]?.[id] ? 'border-emerald-500' : 'border-white/10 hover:border-white/25'}`}
                                                >
                                                    {image ? (
                                                        <ViewImage
                                                            index={index}
                                                            folder={folder}
                                                            image={image}
                                                            isNew={Boolean(
                                                                newFolders[folder]?.[image.name]
                                                            )}
                                                            openDisplay={openDisplay}
                                                            selected={
                                                                !!selectedImages[folder]?.[id]
                                                            }
                                                            copyImage={copyImage}
                                                            copyGyazoLink={copyGyazoLink}
                                                            toggleFavourite={toggleFavourite}
                                                        />
                                                    ) : (
                                                        <span className="absolute inset-0 animate-pulse bg-white/5" />
                                                    )}
                                                </div>
                                            )
                                        }}
                                    />
                                )}
                            </section>
                        )
                    })
                )}
            </div>
            <footer className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-white/10 bg-[#141518] px-6">
                <div className="text-xs text-white/45">
                    <b className="font-semibold text-white/85">{selectedCount}</b> selected
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={!selectedCount}
                        onClick={() => {
                            setTagEditor(selectedItems)
                            setTagDraft('')
                        }}
                        className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-[#202227] px-3 text-xs font-semibold hover:bg-[#292c32] disabled:opacity-30"
                    >
                        <Tags size={14} />
                        Tags
                    </button>
                    <button
                        disabled={!selectedCount}
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-8 items-center gap-2 rounded-md border border-red-400/20 bg-red-500/10 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                    <button
                        disabled={!uploading && !selectedCount}
                        onClick={uploading ? cancelUpload : uploadSelected}
                        className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 ${uploading ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                    >
                        {uploading ? (
                            <LoaderCircle className="animate-spin" size={14} />
                        ) : (
                            <Upload size={14} />
                        )}
                        {uploading ? 'Cancel upload' : 'Upload to Gyazo'}
                    </button>
                </div>
                <button
                    disabled={refreshing}
                    aria-label={
                        refreshing
                            ? 'Refreshing cropped screenshots'
                            : 'Refresh cropped screenshots'
                    }
                    title="Refresh cropped screenshots"
                    onClick={refreshImages}
                    className="ml-auto grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] text-white/70 hover:bg-[#292c32] hover:text-white disabled:opacity-60"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
                </button>
            </footer>
            <ImageDisplay
                displayState={[displayOpen, setDisplayOpen]}
                callbackUpdater={croppedFolders}
                allImages={currentImages}
                specificImageIndex={currentDisplayPosition}
                selectedImage={
                    selectedImages[displayImage.folder]?.[
                        getImageSelectionId(currentEntries[currentDisplayPosition]?.image)
                    ]
                }
                setCloseDisplayImage={() => setDisplayImage({ folder: null, index: null })}
                setNextDisplayImage={() => {
                    if (!currentEntries.length) return
                    const next =
                        currentEntries[(currentDisplayPosition + 1) % currentEntries.length]
                    setDisplayImage((previous) => ({ ...previous, index: next.index }))
                }}
                setPrevDisplayImage={() => {
                    if (!currentEntries.length) return
                    const previousEntry =
                        currentEntries[
                            (currentDisplayPosition - 1 + currentEntries.length) %
                                currentEntries.length
                        ]
                    setDisplayImage((previous) => ({ ...previous, index: previousEntry.index }))
                }}
                toggleSelected={(event) =>
                    toggleSelected(event, displayImage.folder, displayImage.index)
                }
                toggleFavourite={() =>
                    toggleFavourite(
                        displayImage.folder,
                        currentEntries[currentDisplayPosition]?.image?.name
                    )
                }
                copyImage={() =>
                    copyImage(
                        displayImage.folder,
                        currentEntries[currentDisplayPosition]?.image?.name
                    )
                }
                copyGyazoLink={copyGyazoLink}
                loadImage={loadDisplayedImage}
            />
            {confirmDelete && (
                <div
                    className="fixed inset-x-0 bottom-0 top-8 z-50 grid place-items-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setConfirmDelete(false)}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                        className="w-[340px] rounded-xl border border-white/10 bg-[#17191d] p-5 shadow-2xl"
                    >
                        <div className="grid size-9 place-items-center rounded-lg bg-red-500/15 text-red-400">
                            <Trash2 size={18} />
                        </div>
                        <h2 className="mt-4 text-sm font-semibold">
                            Move selected images to Recycle Bin?
                        </h2>
                        <p className="mt-1.5 text-xs leading-5 text-white/45">
                            {selectedItems.length} image{selectedItems.length === 1 ? '' : 's'} will
                            be removed. They can be recovered from the Windows Recycle Bin.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="h-8 rounded-md border border-white/10 bg-[#202227] px-3 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmDelete(false)
                                    deleteImages(selectedItems)
                                }}
                                className="h-8 rounded-md bg-red-600 px-3 text-xs font-semibold hover:bg-red-500"
                            >
                                Move to Recycle Bin
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {tagEditor && (
                <div
                    className="fixed inset-x-0 bottom-0 top-8 z-50 grid place-items-center bg-black/70"
                    onClick={() => setTagEditor(null)}
                >
                    <div
                        className="w-[340px] rounded-xl border border-white/10 bg-[#17191d] p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-sm font-semibold">Set tags</h2>
                        <p className="mt-1 text-[10px] text-white/40">
                            Apply comma-separated tags to {tagEditor.length} selected image
                            {tagEditor.length === 1 ? '' : 's'}.
                        </p>
                        <input
                            autoFocus
                            value={tagDraft}
                            onChange={(event) => setTagDraft(event.target.value)}
                            placeholder="evidence, event, favourite moment"
                            className="mt-4 h-9 w-full rounded-md border border-white/10 bg-[#101114] px-3 text-xs outline-none focus:border-emerald-500/60"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setTagEditor(null)}
                                className="h-8 rounded-md border border-white/10 px-3 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const tags = tagDraft
                                        .split(',')
                                        .map((value) => value.trim())
                                        .filter(Boolean)
                                    await Promise.all(
                                        tagEditor.map((item) =>
                                            setImageTags(item.folder, item.name, tags)
                                        )
                                    )
                                    setTagEditor(null)
                                    setSelectedImages({})
                                    refreshImages()
                                }}
                                className="h-8 rounded-md bg-emerald-600 px-3 text-xs font-semibold"
                            >
                                Apply tags
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default ViewTab
