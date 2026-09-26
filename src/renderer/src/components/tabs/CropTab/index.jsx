/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardPaste, History, LoaderCircle, RefreshCw, Undo2, Upload } from "lucide-react";
import CropImage from "./CropImage";
import ImageDisplay, { openDisplayImage } from "@components/tabs/ImageDisplay";
import GalleryZoom from "@components/GalleryZoom";
import BatchHistory from "@components/BatchHistory";
import VirtualGallery from "@components/VirtualGallery";

const CropTab = ({ screenshots, selectedImages, setSelectedImages, refreshImages, refreshing, refreshLibrary, importImages, cropScreenshots, cropping, undoLastCrop, undoing, restoredImages, onBatchRestored, copyImage, loadFullImage, cropInsets, cropPresets, galleryColumns, setGalleryColumns }) => {
    const [displayImage, setDisplayImage] = useState(null);
    const [displayOpen, setDisplayOpen] = useState(false);
    const [confirmCropAll, setConfirmCropAll] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [draggingFiles, setDraggingFiles] = useState(false);
    const selectedCount = Object.values(selectedImages).filter(Boolean).length;
    const total = screenshots?.length || 0;
    const allSelected = total > 0 && selectedCount === total;

    const toggleSelected = useCallback((event, index) => {
        event?.stopPropagation();
        setSelectedImages(previous => ({ ...previous, [index]: !previous[index] }));
    }, [setSelectedImages]);

    const openDisplay = useCallback((event, index) => openDisplayImage(setDisplayOpen, setDisplayImage, event, index), []);
    const loadDisplayedImage = useCallback(image => loadFullImage(image.name), [loadFullImage]);

    const toggleAll = () => {
        if (!screenshots) return;
        setSelectedImages(Object.fromEntries(screenshots.map((_, index) => [index, !allSelected])));
    };
    useEffect(() => {
        const paste = event => { if (event.clipboardData?.files?.length) { event.preventDefault(); importImages(event.clipboardData.files); } };
        window.addEventListener("paste", paste);
        return () => window.removeEventListener("paste", paste);
    }, [importImages]);

    return <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center px-6">
            <div><h1 className="text-sm font-semibold">Incoming screenshots</h1><p className="mt-0.5 text-[11px] text-white/45">Newest screenshots from your watched folder</p></div>
            {cropping && <div role="status" className="ml-4 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300"><LoaderCircle className="animate-spin" size={13} />Processing crop batch…</div>}
            {undoing && <div role="status" className="ml-4 flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-300"><LoaderCircle className="animate-spin" size={13} />Restoring last batch…</div>}
            <GalleryZoom columns={galleryColumns} setColumns={setGalleryColumns} />
        </header>

        <div onDragEnter={event => { event.preventDefault(); setDraggingFiles(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFiles(false); }} onDrop={event => { event.preventDefault(); setDraggingFiles(false); if (event.dataTransfer.files.length) importImages(event.dataTransfer.files); }} className="relative min-h-0 flex-1 overflow-y-auto px-8 pb-5">
            {draggingFiles && <div className="pointer-events-none fixed inset-x-6 bottom-20 top-24 z-30 grid place-items-center rounded-xl border-2 border-dashed border-emerald-400/60 bg-emerald-950/90"><div className="text-center text-emerald-200"><Upload className="mx-auto" size={24} /><p className="mt-2 text-sm font-semibold">Drop images to import</p><p className="mt-1 text-[10px] text-emerald-200/60">Copies are added to the watched folder</p></div></div>}
            {screenshots === null ? <div className="grid h-full place-items-center"><LoaderCircle className="animate-spin text-white/35" size={24} /></div> : screenshots.length === 0 ? <div className="grid h-full place-items-center"><div className="text-center"><p className="text-sm font-medium text-white/70">No screenshots found</p><p className="mt-1 text-xs text-white/35">Add screenshots to your watched folder, then refresh.</p></div></div> : <VirtualGallery className="mx-auto max-w-6xl" columns={galleryColumns} items={screenshots.map((image, index) => ({ key: image?.name || index, image, index }))} renderItem={({ image, index, key }) => <div key={key} role="checkbox" aria-checked={!!selectedImages[index]} tabIndex={0} onClick={event => toggleSelected(event, index)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleSelected(event, index); } }} className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-[#17191d] text-left transition ${selectedImages[index] ? "border-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,.14)]" : "border-white/10 hover:border-white/25"}`}>{image ? <CropImage index={index} image={image} restored={!!restoredImages?.[image.name]} openDisplay={openDisplay} selected={!!selectedImages[index]} copyImage={copyImage} /> : <span className="absolute inset-0 animate-pulse bg-white/5" />}</div>} />}
        </div>

        <footer className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-white/10 bg-[#141518] px-6">
            <div className="flex items-center gap-2 text-xs text-white/45"><span><b className="font-semibold text-white/85">{selectedCount}</b> of {total} selected</span><button disabled={undoing || cropping} onClick={undoLastCrop} title="Restore source images and move the last batch outputs to the Recycle Bin" className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-[#202227] px-2.5 text-[11px] font-medium text-white/70 hover:bg-[#292c32] hover:text-white disabled:opacity-45">{undoing ? <LoaderCircle className="animate-spin" size={13} /> : <Undo2 size={13} />}{undoing ? "Restoring…" : "Undo recent"}</button><button onClick={() => setHistoryOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-[#202227] px-2.5 text-[11px] font-medium text-white/70 hover:bg-[#292c32] hover:text-white"><History size={13} />History</button></div>
            <div className="flex gap-2">
                <button disabled={!selectedCount || cropping} onClick={() => cropScreenshots(false)} className="flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">{cropping && <LoaderCircle className="animate-spin" size={13} />}{cropping ? "Cropping…" : "Crop selected"}</button>
                <button disabled={!total || cropping} onClick={() => setConfirmCropAll(true)} className="h-8 rounded-md border border-white/10 bg-[#202227] px-3 text-xs font-semibold transition hover:bg-[#292c32] disabled:cursor-not-allowed disabled:text-white/25">Crop all</button>
            </div>
            <div className="ml-auto flex gap-2"><button onClick={() => importImages(null)} title="Paste an image from the clipboard" className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] text-white/65 hover:bg-[#292c32] hover:text-white"><ClipboardPaste size={14} /></button>
                <button disabled={!total} onClick={toggleAll} className="h-8 rounded-md border border-white/10 bg-[#202227] px-3 text-xs font-semibold transition hover:bg-[#292c32] disabled:text-white/25">{allSelected ? "Clear selection" : "Select all"}</button>
                <button disabled={refreshing} aria-label={refreshing ? "Refreshing screenshots" : "Refresh screenshots"} title="Refresh screenshots" onClick={refreshImages} className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] text-white/70 transition hover:bg-[#292c32] hover:text-white disabled:opacity-60"><RefreshCw className={refreshing ? "animate-spin" : ""} size={14} /></button>
            </div>
        </footer>

        <ImageDisplay displayState={[displayOpen, setDisplayOpen]} callbackUpdater={screenshots} allImages={screenshots} specificImageIndex={displayImage} selectedImage={selectedImages[displayImage]} setCloseDisplayImage={() => setDisplayImage(null)} setNextDisplayImage={() => setDisplayImage(index => index === screenshots.length - 1 ? 0 : index + 1)} setPrevDisplayImage={() => setDisplayImage(index => index === 0 ? screenshots.length - 1 : index - 1)} toggleSelected={event => toggleSelected(event, displayImage)} copyImage={() => copyImage(screenshots[displayImage]?.name)} loadImage={loadDisplayedImage} enableCropPreview cropInsets={cropInsets} cropPresets={cropPresets} />

        {confirmCropAll && <div className="fixed inset-x-0 bottom-0 top-8 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmCropAll(false)}><div role="alertdialog" aria-modal="true" aria-labelledby="crop-all-title" onClick={event => event.stopPropagation()} className="w-[340px] rounded-xl border border-white/10 bg-[#17191d] p-5 shadow-2xl"><div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400"><AlertTriangle size={18} /></div><h2 id="crop-all-title" className="mt-4 text-sm font-semibold">Crop all screenshots?</h2><p className="mt-1.5 text-xs leading-5 text-white/45">This will crop all {total} screenshot{total === 1 ? "" : "s"} using your saved crop area and remove them from the watched folder.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmCropAll(false)} className="h-8 rounded-md border border-white/10 bg-[#202227] px-3 text-xs font-semibold hover:bg-[#292c32]">Cancel</button><button onClick={() => { setConfirmCropAll(false); cropScreenshots(true); }} className="h-8 rounded-md bg-emerald-600 px-3 text-xs font-semibold hover:bg-emerald-500">Crop all {total}</button></div></div></div>}
        <BatchHistory open={historyOpen} onClose={() => setHistoryOpen(false)} onRestored={async result => { onBatchRestored?.(result); await Promise.all([refreshImages(), refreshLibrary()]); }} />
    </section>;
};

export default CropTab;
