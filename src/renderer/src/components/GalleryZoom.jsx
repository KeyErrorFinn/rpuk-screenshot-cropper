/* eslint-disable react/prop-types */
import { Image, Images } from "lucide-react";
import { MAX_GALLERY_COLUMNS, MIN_GALLERY_COLUMNS, clampGalleryColumns } from "@renderer/lib/galleryZoom";

const GalleryZoom = ({ columns, setColumns }) => <div className="ml-auto flex items-center gap-2 rounded-md border border-white/10 bg-[#141518] px-2.5 py-1.5">
    <Image size={12} className="text-white/35" aria-hidden="true" />
    <input aria-label={`Gallery columns: ${columns}`} title={`${columns} images per row`} type="range" min={MIN_GALLERY_COLUMNS} max={MAX_GALLERY_COLUMNS} step="1" value={columns} onChange={event => setColumns(clampGalleryColumns(event.target.value))} className="h-1 w-28 cursor-pointer accent-emerald-500" />
    <Images size={13} className="text-white/35" aria-hidden="true" />
    <span className="w-3 text-center text-[11px] font-semibold tabular-nums text-white/60">{columns}</span>
</div>;

export default GalleryZoom;
