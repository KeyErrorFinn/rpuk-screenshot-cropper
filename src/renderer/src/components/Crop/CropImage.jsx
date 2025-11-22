import React from 'react';
import { Check, Eye } from 'lucide-react';

import { AspectRatio } from "@components-ui/aspect-ratio"

import { cn } from "@renderer/lib/utils"

const CropImage = ({
    index,
    image,
    openDisplay,
    selected,
    toggleSelected
}) => {

    return (
        <>
            <AspectRatio
                ratio={16 / 9}
                className={cn(`
                    relative w-full overflow-hidden rounded-lg shadow-lg border-2 select-none
                    transform transition duration-300`,
                    selected ? "scale-105" : "hover:scale-105"
                )}
                onClick={(e) => toggleSelected(e, index)}
            >
                {/* IMAGE */}
                <img
                    src={image.basicUrl}
                    alt={`Screenshot ${index + 1}`}
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
                    onClick={(e) => openDisplay(e, index)}
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
            </AspectRatio>
        </>
    );
}

export default React.memo(CropImage);