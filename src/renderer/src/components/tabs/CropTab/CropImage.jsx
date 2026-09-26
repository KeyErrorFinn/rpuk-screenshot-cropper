/* eslint-disable react/prop-types */
import React from 'react';
import { Check, Copy, Eye } from 'lucide-react';
import LazyThumbnail from "@components/LazyThumbnail";

const CropImage = ({
    index,
    image,
    restored,
    openDisplay,
    selected,
    copyImage,
}) => {

    return (
        <>
        {/* IMAGE */}
        <LazyThumbnail src={image.basicUrl} loadSrc={image.loadThumbnail} alt={`Screenshot ${index + 1}`} className="gallery-image h-full w-full select-none object-cover" />

        {/* WHITE BACKGROUND */}
        <div className={`pointer-events-none absolute inset-0 bg-emerald-400/15 transition-opacity ${selected ? "opacity-100" : "opacity-0"}`} />

        {/* VIEW EYE */}
        <div title="Open enlarged viewer" className="absolute bottom-1.5 left-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-black/75 text-white transition hover:bg-black/90"
            onClick={(e) => openDisplay(e, index)}
        >
            <Eye size={14} strokeWidth={3} />
        </div>

        {image.width && image.height && <div className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-white/70">{image.width}×{image.height}</div>}
        <div className="pointer-events-none absolute right-1.5 top-1.5 flex flex-col items-end gap-1.5">
            {restored && <div className="rounded-md border border-sky-300/60 bg-sky-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.7)]">Restored</div>}
            {selected && <div className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.55)]"><Check size={15} strokeWidth={3} /></div>}
        </div>
        <button aria-label={`Copy screenshot ${index + 1}`} title="Copy image" className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/75 text-white transition hover:bg-black/90" onClick={event => { event.stopPropagation(); copyImage(image.name); }}><Copy size={12} strokeWidth={2.5} /></button>
        </>
    );
};

export default React.memo(CropImage);
