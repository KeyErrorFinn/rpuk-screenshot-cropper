/* eslint-disable react/prop-types */
import React from 'react';
import { Check, CloudUpload, Copy, Eye, Link, Star } from 'lucide-react';
import LazyThumbnail from "@components/LazyThumbnail";

const ViewImage = ({
    index,
    folder,
    image,
    isNew,
    openDisplay,
    selected,
    copyImage,
    copyGyazoLink,
    toggleFavourite,
}) => {

    return (
        <>
        {/* IMAGE */}
        <LazyThumbnail src={image.basicUrl} loadSrc={image.loadThumbnail} alt={`Cropped Image ${index + 1}`} className="gallery-image h-full w-full select-none object-cover" />

        {/* WHITE BACKGROUND */}
        <div className={`pointer-events-none absolute inset-0 bg-emerald-400/15 transition-opacity ${selected ? "opacity-100" : "opacity-0"}`} />

        {/* VIEW EYE */}
        <div title="Open enlarged viewer" className="absolute bottom-1.5 left-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-black/75 text-white transition hover:bg-black/90"
            onClick={(e) => openDisplay(e, folder, index)}
        >
            <Eye size={14} strokeWidth={3} />
        </div>

        {image.width && image.height && <div className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-white/70">{image.width}×{image.height}</div>}
        <button aria-label={`${image.favourite ? "Remove" : "Add"} favourite`} title={image.favourite ? "Unpin favourite" : "Pin as favourite"} className={`absolute left-1.5 top-8 grid size-6 place-items-center rounded-md border bg-black/80 ${image.favourite ? "border-amber-300/40 text-amber-300" : "border-white/20 text-white/65 hover:border-white/35 hover:text-white"}`} onClick={event => { event.stopPropagation(); toggleFavourite(folder, image.name); }}><Star size={13} fill={image.favourite ? "currentColor" : "none"} /></button>

        <div className="pointer-events-none absolute right-1.5 top-1.5 flex flex-col items-end gap-1.5">
            {isNew && <div className="rounded-md border border-emerald-300/60 bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-[0_0_16px_rgba(52,211,153,0.7)]">New</div>}
            {image.gyazoUrl && <div className="flex h-6 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-950/90 px-1.5 text-[10px] font-semibold text-emerald-300"><CloudUpload size={11} />Uploaded</div>}
            {selected && <div className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={15} strokeWidth={3} /></div>}
        </div>

        {image.gyazoUrl && <button aria-label={`Copy Gyazo link for image ${index + 1}`} title="Copy Gyazo link" className="absolute bottom-1.5 right-9 flex size-6 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-950/90 text-emerald-300 transition hover:bg-emerald-900" onClick={event => { event.stopPropagation(); copyGyazoLink(image.gyazoUrl); }}><Link size={12} strokeWidth={2.5} /></button>}
        <button aria-label={`Copy cropped image ${index + 1}`} title="Copy image" className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/75 text-white transition hover:bg-black/90" onClick={event => { event.stopPropagation(); copyImage(folder, image.name); }}><Copy size={12} strokeWidth={2.5} /></button>
        </>
    );
};

export default React.memo(ViewImage);
