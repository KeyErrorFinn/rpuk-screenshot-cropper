import React from 'react';
import { Check, Eye } from 'lucide-react';

import { cn } from "@renderer/lib/utils";

const ViewImage = ({
    index,
    folder,
    image,
    openDisplay,
    selected,
}) => {

    return (
        <>
        {/* IMAGE */}
        <img
            src={image.basicUrl}
            alt={`Cropped Image ${index + 1}`}
            className="gallery-image w-full h-full object-cover select-none"
            loading="lazy"
        />

        {/* WHITE BACKGROUND */}
        <div className={cn(
            "absolute inset-0 bg-white/30 pointer-events-none transition-opacity",
            selected ? "opacity-100" : "opacity-0"
        )} />

        {/* VIEW EYE */}
        <div className={cn(`
                absolute bottom-1 left-1 transition-opacity
                size-6 rounded-md bg-black opacity-80 blur-[0.5px]
                flex justify-center items-center cursor-pointer`
            )}
            onClick={(e) => openDisplay(e, folder, index)}
        >
            <Eye size={14} strokeWidth={3} />
        </div>

        {/* SELECTED TICK */}
        <div className={cn(`
            absolute right-1 top-1 pointer-events-none transition-opacity
            size-6 rounded-full bg-blue-400 blur-[0.5px]
            flex justify-center items-center`,
            selected ? "opacity-100" : "opacity-0"
        )}>
            <Check size={15} strokeWidth={3} />
        </div>
        </>
    );
};

export default React.memo(ViewImage);