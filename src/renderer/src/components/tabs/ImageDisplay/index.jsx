/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CloudUpload, Copy, Link, LoaderCircle, Maximize2, Minimize2, ScanLine, Square, Star, X, ZoomIn, ZoomOut } from "lucide-react";
import { getImageViewerAction } from "@renderer/lib/imageViewerShortcuts";
import { getCropInsetsForResolution } from "../../../../../shared/cropSettings.js";

export const openDisplayImage = (setOpen, setImage, event, image) => {
    event.stopPropagation();
    setImage(image);
    setOpen(true);
};

const ImageDisplay = ({ displayState, allImages, specificImageIndex, selectedImage, setCloseDisplayImage, setNextDisplayImage, setPrevDisplayImage, toggleSelected, toggleFavourite, copyImage, copyGyazoLink, loadImage, enableCropPreview = false, cropInsets, cropPresets }) => {
    const [open, setOpen] = displayState;
    const [displayUrl, setDisplayUrl] = useState(null);
    const [cropPreviewVisible, setCropPreviewVisible] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [panning, setPanning] = useState(false);
    const [viewerFullscreen, setViewerFullscreen] = useState(false);
    const panStartRef = useRef(null);
    const lastWheelRef = useRef(0);
    const close = useCallback(() => { window.api.setFullscreen(false); setViewerFullscreen(false); setOpen(false); setCloseDisplayImage(); }, [setCloseDisplayImage, setOpen]);

    useEffect(() => () => window.api.setFullscreen(false), []);

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = event => {
            const action = getImageViewerAction(event);
            if (!action) return;
            event.preventDefault();
            if (action === "previous") setPrevDisplayImage();
            if (action === "next") setNextDisplayImage();
            if (action === "select") toggleSelected();
            if (action === "copy") copyImage();
            if (action === "close") close();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [close, copyImage, open, setNextDisplayImage, setPrevDisplayImage, toggleSelected]);

    const currentImage = allImages?.[specificImageIndex];
    const previewInsets = enableCropPreview && currentImage?.width && currentImage?.height ? getCropInsetsForResolution({ cropInsets, cropPresets }, currentImage.width, currentImage.height) : null;
    const previewPercentages = previewInsets ? {
        top: previewInsets.top / currentImage.height * 100,
        right: previewInsets.right / currentImage.width * 100,
        bottom: previewInsets.bottom / currentImage.height * 100,
        left: previewInsets.left / currentImage.width * 100,
    } : null;
    useEffect(() => {
        let cancelled = false;
        setDisplayUrl(null);
        if (!open || !currentImage) return () => { cancelled = true; };
        Promise.resolve(loadImage(currentImage))
            .then(url => {
                if (!cancelled) setDisplayUrl(url || currentImage.basicUrl);
            })
            .catch(() => {
                if (!cancelled) setDisplayUrl(currentImage.basicUrl);
            });
        return () => { cancelled = true; };
    }, [currentImage, loadImage, open]);

    useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [specificImageIndex]);

    if (!open || !allImages?.length || specificImageIndex === null) return null;

    const handleWheel = event => {
        event.preventDefault();
        if (event.ctrlKey) return setZoom(value => Math.max(1, Math.min(5, value + (event.deltaY < 0 ? 0.25 : -0.25))));
        if (Math.abs(event.deltaY) < 20 || Date.now() - lastWheelRef.current < 250) return;
        lastWheelRef.current = Date.now();
        if (event.deltaY > 0) setNextDisplayImage(); else setPrevDisplayImage();
    };
    const startPan = event => {
        if (zoom <= 1 || event.button !== 0) return;
        event.stopPropagation();
        panStartRef.current = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y };
        setPanning(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const movePan = event => {
        if (!panStartRef.current) return;
        setPan({ x: panStartRef.current.x + event.clientX - panStartRef.current.clientX, y: panStartRef.current.y + event.clientY - panStartRef.current.clientY });
    };
    const stopPan = () => { panStartRef.current = null; setPanning(false); };

    return <div onClick={close} onWheel={handleWheel} className={`fixed inset-x-0 bottom-0 ${viewerFullscreen ? "top-0" : "top-8"} z-40 flex items-center justify-center overflow-hidden bg-black/85 backdrop-blur-sm`}>
        {displayUrl ? <div onClick={event => event.stopPropagation()} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} className={`relative inline-flex max-h-[88%] max-w-[88%] overflow-hidden shadow-2xl ${zoom > 1 ? panning ? "cursor-grabbing" : "cursor-grab" : ""}`}><img src={displayUrl} alt="Screenshot preview" draggable={false} className="max-h-[calc(100vh-120px)] max-w-[88vw] select-none object-contain" />{cropPreviewVisible && previewPercentages && <><div className="pointer-events-none absolute inset-x-0 top-0 bg-black/85" style={{ height: `${previewPercentages.top}%` }} /><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/85" style={{ height: `${previewPercentages.bottom}%` }} /><div className="pointer-events-none absolute bottom-0 left-0 top-0 bg-black/85" style={{ width: `${previewPercentages.left}%` }} /><div className="pointer-events-none absolute bottom-0 right-0 top-0 bg-black/85" style={{ width: `${previewPercentages.right}%` }} /><div className="pointer-events-none absolute border border-dashed border-emerald-200/60" style={{ top: `${previewPercentages.top}%`, right: `${previewPercentages.right}%`, bottom: `${previewPercentages.bottom}%`, left: `${previewPercentages.left}%` }} /></>}</div> : <LoaderCircle className="animate-spin text-white/50" size={28} />}
        <button aria-label="Close preview" title="Close preview (Escape)" onClick={close} className="absolute right-4 top-4 grid size-9 place-items-center rounded-md bg-red-600 text-white hover:bg-red-500"><X size={17} /></button>
        <button aria-label="Toggle full-screen viewer" title="Toggle full-screen viewer" onClick={event => { event.stopPropagation(); setViewerFullscreen(value => { const next = !value; window.api.setFullscreen(next); return next; }); }} className="absolute right-16 top-4 grid size-9 place-items-center rounded-md border border-white/10 bg-[#202227] text-white/70 hover:bg-[#292c32] hover:text-white">{viewerFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        <div className="absolute bottom-4 left-16 flex items-center gap-1"><button aria-label="Zoom out" title="Zoom out (Ctrl+wheel)" onClick={event => { event.stopPropagation(); setZoom(value => Math.max(1, value - 0.25)); }} className="grid size-9 place-items-center rounded-md bg-[#202227]"><ZoomOut size={15} /></button><span className="min-w-11 text-center text-[10px] text-white/60">{zoom.toFixed(2).replace(/\.00$/, "")}×</span><button aria-label="Zoom in" title="Zoom in (Ctrl+wheel)" onClick={event => { event.stopPropagation(); setZoom(value => Math.min(5, value + 0.25)); }} className="grid size-9 place-items-center rounded-md bg-[#202227]"><ZoomIn size={15} /></button></div>
        {enableCropPreview && <button aria-label="Toggle cropped view" aria-pressed={cropPreviewVisible} title="Show what will be cropped" onClick={event => { event.stopPropagation(); setCropPreviewVisible(value => !value); }} className={`absolute right-28 top-4 flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${cropPreviewVisible ? "border-emerald-400/30 bg-emerald-950 text-emerald-300" : "border-white/10 bg-[#202227] text-white/70 hover:bg-[#292c32]"}`}><ScanLine size={15} />Cropped view</button>}
        <button aria-label="Previous image" title="Previous image (Left arrow)" onClick={event => { event.stopPropagation(); setPrevDisplayImage(); }} className="absolute left-4 grid size-10 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ChevronLeft size={19} /></button>
        <button aria-label="Next image" title="Next image (Right arrow)" onClick={event => { event.stopPropagation(); setNextDisplayImage(); }} className="absolute right-4 grid size-10 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ChevronRight size={19} /></button>
        <div className="absolute left-4 top-4 flex items-center gap-2">
            {toggleFavourite && <button aria-label={currentImage.favourite ? "Remove favourite" : "Add favourite"} title={currentImage.favourite ? "Unpin favourite" : "Pin as favourite"} onClick={event => { event.stopPropagation(); toggleFavourite(); }} className={`grid size-8 place-items-center rounded-md border transition ${currentImage.favourite ? "border-amber-300/40 bg-amber-950/90 text-amber-300" : "border-white/10 bg-[#202227] text-white/65 hover:bg-[#292c32] hover:text-white"}`}><Star size={15} fill={currentImage.favourite ? "currentColor" : "none"} /></button>}
            {currentImage.gyazoUrl && <div className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-950/90 px-3 text-xs font-semibold text-emerald-300"><CloudUpload size={14} />Uploaded to Gyazo</div>}
        </div>
        <span className="absolute bottom-4 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white/70">{specificImageIndex + 1} / {allImages.length}</span>
        {currentImage.gyazoUrl && <button aria-label="Copy Gyazo image link" title="Copy direct Gyazo image link" onClick={event => { event.stopPropagation(); copyGyazoLink(currentImage.gyazoUrl); }} className="absolute bottom-4 right-28 grid size-9 place-items-center rounded-md border border-emerald-400/30 bg-emerald-950 text-emerald-300 hover:bg-emerald-900"><Link size={16} /></button>}
        <button aria-label="Copy image to clipboard" title="Copy image (Ctrl+C)" onClick={event => { event.stopPropagation(); copyImage(); }} className="absolute bottom-4 right-16 grid size-9 place-items-center rounded-md bg-[#202227] hover:bg-[#292c32]"><Copy size={16} /></button>
        <button aria-label={selectedImage ? "Unselect image" : "Select image"} title={`${selectedImage ? "Unselect" : "Select"} image (Space)`} onClick={toggleSelected} className={`absolute bottom-4 right-4 grid size-9 place-items-center rounded-md ${selectedImage ? "bg-emerald-600" : "bg-[#202227]"}`}>{selectedImage ? <Check size={17} /> : <Square size={16} />}</button>
    </div>;
};

export default ImageDisplay;
