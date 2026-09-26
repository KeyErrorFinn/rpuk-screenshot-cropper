/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Redo2, RotateCcw, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@renderer/context/SettingsContext";
import { CROP_PRESETS, DEFAULT_CROP_INSETS, normalizeCropInsets, scaleCropInsets } from "../../../../../shared/cropSettings.js";
import { analyseCropInsetsFromPixels, combineCropAnalyses } from "@renderer/lib/cropAssistance";

const edges = ["top", "right", "bottom", "left"];

const CropAreaTab = ({ screenshots, loadFullImage }) => {
    const { userSettings, setUserSettings } = useSettings();
    const [insets, setInsets] = useState(() => normalizeCropInsets(userSettings.cropInsets || DEFAULT_CROP_INSETS));
    const [sampleIndex, setSampleIndex] = useState(0);
    const [fullImageUrl, setFullImageUrl] = useState(null);
    const [naturalSizes, setNaturalSizes] = useState({});
    const [dragging, setDragging] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [panning, setPanning] = useState(false);
    const [dirty, setDirty] = useState(false);
    const previewRef = useRef(null);
    const viewportRef = useRef(null);
    const panStartRef = useRef(null);
    const cropDraftsRef = useRef({});
    const activeResolutionRef = useRef(null);
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const dragStartInsetsRef = useRef(null);
    const inputStartInsetsRef = useRef(null);
    const [, forceHistoryUpdate] = useState(0);
    const sample = screenshots?.[sampleIndex];
    const naturalSize = sample ? naturalSizes[sample.name] : null;
    const width = naturalSize?.width || sample?.width || null;
    const height = naturalSize?.height || sample?.height || null;
    const workingWidth = width || 1920;
    const workingHeight = height || 1080;
    const resolutionKey = width && height ? `${width}x${height}` : null;

    useEffect(() => {
        if (!resolutionKey || activeResolutionRef.current === resolutionKey) return;
        activeResolutionRef.current = resolutionKey;
        const saved = cropDraftsRef.current[resolutionKey] || userSettings.cropPresets?.[resolutionKey];
        const next = saved || scaleCropInsets(userSettings.cropInsets || DEFAULT_CROP_INSETS, width, height);
        setInsets(normalizeCropInsets(next));
        undoStackRef.current = [];
        redoStackRef.current = [];
        forceHistoryUpdate(value => value + 1);
    }, [height, resolutionKey, userSettings.cropInsets, userSettings.cropPresets, width]);

    useEffect(() => {
        let cancelled = false;
        setFullImageUrl(null);
        if (sample) loadFullImage(sample.name).then(url => { if (!cancelled) setFullImageUrl(url); });
        return () => { cancelled = true; };
    }, [loadFullImage, sample]);

    const updateEdge = useCallback((edge, value) => {
        setDirty(true);
        setInsets(previous => {
            const maximum = edge === "top" ? workingHeight - previous.bottom - 1 : edge === "bottom" ? workingHeight - previous.top - 1 : edge === "left" ? workingWidth - previous.right - 1 : workingWidth - previous.left - 1;
            const next = { ...previous, [edge]: Math.max(0, Math.min(maximum, Math.round(Number(value) || 0))) };
            if (activeResolutionRef.current) cropDraftsRef.current[activeResolutionRef.current] = next;
            return next;
        });
    }, [workingHeight, workingWidth]);

    const rememberState = value => {
        undoStackRef.current.push(normalizeCropInsets(value));
        if (undoStackRef.current.length > 100) undoStackRef.current.shift();
        redoStackRef.current = [];
        forceHistoryUpdate(value => value + 1);
    };
    const applyInsets = value => {
        setDirty(true);
        rememberState(insets);
        const next = normalizeCropInsets(value);
        if (resolutionKey) cropDraftsRef.current[resolutionKey] = next;
        setInsets(next);
    };
    const undo = () => {
        const previous = undoStackRef.current.pop();
        if (!previous) return;
        redoStackRef.current.push(insets);
        setInsets(previous);
        if (resolutionKey) cropDraftsRef.current[resolutionKey] = previous;
        setDirty(true);
        forceHistoryUpdate(value => value + 1);
    };
    const redo = () => {
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(insets);
        setInsets(next);
        if (resolutionKey) cropDraftsRef.current[resolutionKey] = next;
        setDirty(true);
        forceHistoryUpdate(value => value + 1);
    };
    useEffect(() => {
        const handleHistoryShortcut = event => {
            if (!event.ctrlKey || event.altKey || event.metaKey) return;
            if (event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) redo(); else undo();
            } else if (event.key.toLowerCase() === "y") {
                event.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handleHistoryShortcut);
        return () => window.removeEventListener("keydown", handleHistoryShortcut);
    });
    const startEdgeDrag = edge => {
        dragStartInsetsRef.current = insets;
        setDragging(edge);
    };

    useEffect(() => {
        if (!dragging) return undefined;
        const move = event => {
            const rect = previewRef.current?.getBoundingClientRect();
            if (!rect) return;
            if (dragging === "top") updateEdge("top", (event.clientY - rect.top) / rect.height * workingHeight);
            if (dragging === "bottom") updateEdge("bottom", (rect.bottom - event.clientY) / rect.height * workingHeight);
            if (dragging === "left") updateEdge("left", (event.clientX - rect.left) / rect.width * workingWidth);
            if (dragging === "right") updateEdge("right", (rect.right - event.clientX) / rect.width * workingWidth);
        };
        const stop = () => {
            if (dragStartInsetsRef.current) rememberState(dragStartInsetsRef.current);
            dragStartInsetsRef.current = null;
            setDragging(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
        return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    }, [dragging, updateEdge, workingHeight, workingWidth]);

    const save = async () => {
        if (!width || !height) return;
        const savedPreset = { ...normalizeCropInsets(insets), referenceWidth: width, referenceHeight: height };
        const nextSettings = { ...userSettings, cropInsets: savedPreset, cropPresets: { ...(userSettings.cropPresets || {}), [resolutionKey]: savedPreset } };
        await window.api.setSettings(nextSettings);
        setUserSettings(nextSettings);
        setDirty(false);
        toast.success("Crop area saved");
    };
    useEffect(() => {
        window.__cropEditorDirty = dirty;
        const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
        window.addEventListener("beforeunload", warn);
        return () => { window.__cropEditorDirty = false; window.removeEventListener("beforeunload", warn); };
    }, [dirty]);
    const suggestCrop = async () => {
        if (!fullImageUrl || !width || !height) return;
        const candidates = screenshots.filter(image => (image.width || width) === width && (image.height || height) === height).slice(0, 5);
        const analyses = [];
        for (const candidate of candidates) {
            const url = candidate.name === sample.name ? fullImageUrl : await loadFullImage(candidate.name);
            const image = new Image(); image.src = url; await image.decode();
            const scale = Math.min(1, 480 / image.naturalWidth);
            const canvas = document.createElement("canvas"); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
            const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const result = analyseCropInsetsFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            analyses.push({ ...result, insets: Object.fromEntries(Object.entries(result.insets).map(([edge, value]) => [edge, Math.round(value / scale)])) });
        }
        const combined = combineCropAnalyses(analyses);
        applyInsets(combined.insets);
        toast.info(`Analysed ${combined.sampleCount} matching screenshot${combined.sampleCount === 1 ? "" : "s"}; ${Math.round(combined.confidence * 100)}% confidence`);
    };
    const resetPreset = () => applyInsets(scaleCropInsets(DEFAULT_CROP_INSETS, width || 1920, height || 1080));
    const deletePreset = async () => {
        if (!resolutionKey || !userSettings.cropPresets?.[resolutionKey]) return;
        const cropPresets = { ...userSettings.cropPresets }; delete cropPresets[resolutionKey];
        const nextSettings = { ...userSettings, cropPresets };
        await window.api.setSettings(nextSettings); setUserSettings(nextSettings); setDirty(false);
        applyInsets(scaleCropInsets(nextSettings.cropInsets || DEFAULT_CROP_INSETS, width, height)); setDirty(false);
        toast.success(`${width}×${height} preset removed`);
    };
    const percentages = { top: insets.top / workingHeight * 100, right: insets.right / workingWidth * 100, bottom: insets.bottom / workingHeight * 100, left: insets.left / workingWidth * 100 };

    const handleWheel = event => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        const viewport = viewportRef.current;
        if (!viewport) return;
        const previousZoom = zoom;
        const nextZoom = Math.max(1, Math.min(4, previousZoom + (event.deltaY < 0 ? 0.25 : -0.25)));
        if (nextZoom === previousZoom) return;
        const rect = viewport.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const contentX = viewport.scrollLeft + cursorX;
        const contentY = viewport.scrollTop + cursorY;
        setZoom(nextZoom);
        requestAnimationFrame(() => {
            const ratio = nextZoom / previousZoom;
            viewport.scrollLeft = contentX * ratio - cursorX;
            viewport.scrollTop = contentY * ratio - cursorY;
        });
    };

    const startPan = event => {
        if (zoom <= 1 || event.button !== 0 || event.target.closest("button")) return;
        const viewport = viewportRef.current;
        panStartRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
        setPanning(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const movePan = event => {
        if (!panStartRef.current) return;
        const viewport = viewportRef.current;
        viewport.scrollLeft = panStartRef.current.left - (event.clientX - panStartRef.current.x);
        viewport.scrollTop = panStartRef.current.top - (event.clientY - panStartRef.current.y);
    };
    const stopPan = () => { panStartRef.current = null; setPanning(false); };

    return <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-6"><div><h1 className="text-sm font-semibold">Crop area</h1><p className="mt-0.5 text-xs text-white/40">Drag the green edges or enter exact pixel values</p></div>{sample && <div className="flex items-center gap-2"><button aria-label="Previous sample" title="Previous source image" onClick={() => setSampleIndex(index => index === 0 ? screenshots.length - 1 : index - 1)} className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ChevronLeft size={15} /></button><span className="min-w-20 text-center text-[10px] text-white/45">{sampleIndex + 1} / {screenshots.length}</span><button aria-label="Next sample" title="Next source image" onClick={() => setSampleIndex(index => index === screenshots.length - 1 ? 0 : index + 1)} className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ChevronRight size={15} /></button></div>}</header>
        <div className="flex min-h-0 flex-1 gap-5 px-6 pb-5">
            <div ref={viewportRef} onWheel={handleWheel} className="min-w-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-black/55">
                <div className={`grid min-h-full min-w-full p-3 ${zoom > 1 ? "place-items-start" : "place-items-center"}`}>
                {!screenshots ? <LoaderCircle className="animate-spin text-white/35" size={24} /> : !sample ? <p className="text-xs text-white/35">Add an uncropped screenshot to configure the crop area.</p> : <div ref={previewRef} className="relative select-none overflow-hidden shadow-2xl" style={{ aspectRatio: width && height ? `${width} / ${height}` : "16 / 9", width: `${zoom * 100}%` }}>
                    <div className={`absolute inset-0 z-0 ${zoom > 1 ? panning ? "cursor-grabbing" : "cursor-grab" : ""}`} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} />
                    {fullImageUrl ? <img src={fullImageUrl} alt="Uncropped crop-area preview" draggable={false} onLoad={event => { const { naturalWidth, naturalHeight } = event.currentTarget; setNaturalSizes(previous => ({ ...previous, [sample.name]: { width: naturalWidth, height: naturalHeight } })); }} className="h-full w-full object-fill" /> : <div className="grid h-full w-full place-items-center bg-white/[0.03]"><LoaderCircle className="animate-spin text-white/35" size={24} /></div>}
                    <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/90" style={{ height: `${percentages.top}%` }} /><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/90" style={{ height: `${percentages.bottom}%` }} /><div className="pointer-events-none absolute bottom-0 left-0 top-0 bg-black/90" style={{ width: `${percentages.left}%` }} /><div className="pointer-events-none absolute bottom-0 right-0 top-0 bg-black/90" style={{ width: `${percentages.right}%` }} />
                    <div className="pointer-events-none absolute border border-dashed border-emerald-200/60" style={{ top: `${percentages.top}%`, right: `${percentages.right}%`, bottom: `${percentages.bottom}%`, left: `${percentages.left}%` }}><span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-white/65">Kept area</span></div>
                    <button aria-label="Drag top crop edge" title="Drag top crop edge" onPointerDown={() => startEdgeDrag("top")} className="absolute h-3 -translate-y-1/2 cursor-ns-resize bg-transparent" style={{ top: `${percentages.top}%`, right: `${percentages.right}%`, left: `${percentages.left}%` }} /><button aria-label="Drag bottom crop edge" title="Drag bottom crop edge" onPointerDown={() => startEdgeDrag("bottom")} className="absolute h-3 translate-y-1/2 cursor-ns-resize bg-transparent" style={{ bottom: `${percentages.bottom}%`, right: `${percentages.right}%`, left: `${percentages.left}%` }} /><button aria-label="Drag left crop edge" title="Drag left crop edge" onPointerDown={() => startEdgeDrag("left")} className="absolute w-3 -translate-x-1/2 cursor-ew-resize bg-transparent" style={{ top: `${percentages.top}%`, bottom: `${percentages.bottom}%`, left: `${percentages.left}%` }} /><button aria-label="Drag right crop edge" title="Drag right crop edge" onPointerDown={() => startEdgeDrag("right")} className="absolute w-3 translate-x-1/2 cursor-ew-resize bg-transparent" style={{ top: `${percentages.top}%`, right: `${percentages.right}%`, bottom: `${percentages.bottom}%` }} />
                </div>}
                </div>
            </div>
            <aside className="w-48 shrink-0 overflow-y-auto rounded-lg border border-white/10 bg-[#141518] p-3"><p className="text-[11px] font-semibold">Starting points</p><div className="mt-2 grid grid-cols-2 gap-1.5">{CROP_PRESETS.map(preset => <button key={preset.label} title={preset.resolution} onClick={() => applyInsets(preset.insets)} className="h-8 rounded-md border border-white/10 bg-[#202227] text-[10px] font-semibold text-white/65 hover:bg-[#292c32] hover:text-white">{preset.label}</button>)}</div>{resolutionKey && <div className="mt-3 rounded-md border border-emerald-400/15 bg-emerald-500/5 p-2 text-[9px] leading-4 text-emerald-300/75"><p>Editing preset</p><p className="font-semibold text-emerald-300">{width}×{height}</p>{userSettings.cropPresets?.[resolutionKey] && <p className="text-emerald-300/50">Saved preset loaded</p>}</div>}<div className="mt-4 grid grid-cols-2 gap-2">{edges.map(edge => <label key={edge} className="text-[9px] capitalize text-white/45">{edge}<input type="number" min="0" value={insets[edge]} onFocus={() => { inputStartInsetsRef.current = insets; }} onBlur={() => { const start = inputStartInsetsRef.current; if (start && edges.some(key => start[key] !== insets[key])) rememberState(start); inputStartInsetsRef.current = null; }} onChange={event => updateEdge(edge, event.target.value)} className="mt-1 h-8 w-full rounded-md border border-white/10 bg-[#101114] px-2 text-xs text-white outline-none focus:border-emerald-500/70" /></label>)}</div><div className="mt-4 border-t border-white/10 pt-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-white/70">Zoom</p><span className="text-[9px] text-white/40">{zoom.toFixed(2).replace(/\.00$/, "")}×</span></div><div className="mt-2 flex items-center gap-2"><button aria-label="Zoom out" title="Zoom out (Ctrl+mouse wheel)" onClick={() => setZoom(value => Math.max(1, value - 0.25))} className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ZoomOut size={13} /></button><input aria-label="Crop preview zoom" title="Crop preview zoom" type="range" min="1" max="4" step="0.25" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-emerald-500" /><button aria-label="Zoom in" title="Zoom in (Ctrl+mouse wheel)" onClick={() => setZoom(value => Math.min(4, value + 0.25))} className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#202227] hover:bg-[#292c32]"><ZoomIn size={13} /></button></div><button title="Reset preview zoom" onClick={() => setZoom(1)} className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-[#202227] text-[9px] text-white/55 hover:bg-[#292c32] hover:text-white"><RotateCcw size={11} />Reset zoom</button></div><div className="mt-4 rounded-md bg-white/5 p-2 text-[9px] leading-4 text-white/40">{width && height ? <><p>Source: {width}×{height}</p><p>Output: {width - insets.left - insets.right}×{height - insets.top - insets.bottom}</p></> : <p>Detecting source resolution…</p>}</div></aside>
        </div>
        <footer className="flex h-[60px] shrink-0 items-center justify-between border-t border-white/10 bg-[#141518] px-6"><div className="flex items-center gap-2"><p className="mr-2 text-[11px] text-white/45">Save a separate crop area for each resolution.{dirty && <span className="ml-2 text-amber-300">Unsaved changes</span>}</p><button aria-label="Undo crop edit" title="Undo crop edit (Ctrl+Z)" disabled={!undoStackRef.current.length} onClick={undo} className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] disabled:opacity-30"><Undo2 size={14} /></button><button aria-label="Redo crop edit" title="Redo crop edit (Ctrl+Y or Ctrl+Shift+Z)" disabled={!redoStackRef.current.length} onClick={redo} className="grid size-8 place-items-center rounded-md border border-white/10 bg-[#202227] disabled:opacity-30"><Redo2 size={14} /></button></div><div className="flex gap-2"><button onClick={resetPreset} className="h-8 rounded-md border border-white/10 px-2.5 text-[11px] text-white/65">Reset</button><button disabled={!userSettings.cropPresets?.[resolutionKey]} onClick={deletePreset} className="h-8 rounded-md border border-red-400/20 px-2.5 text-[11px] text-red-300 disabled:opacity-30">Delete preset</button><button disabled={!fullImageUrl} onClick={suggestCrop} title="Checks up to five screenshots at this resolution for consistent plain borders, then suggests crop edges for you to review" className="h-8 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300 disabled:opacity-30">Detect borders</button><button disabled={!width || !height} onClick={save} className="h-8 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">Save {width && height ? `${width}×${height}` : ""} preset</button></div></footer>
    </section>;
};

export default CropAreaTab;
