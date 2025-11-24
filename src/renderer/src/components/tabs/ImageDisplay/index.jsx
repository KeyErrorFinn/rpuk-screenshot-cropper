import { useCallback } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Square,
    SquareCheckBig
} from 'lucide-react';

import { Button } from '@components-ui/button';
import { TGP } from "@components-ui/typography";

import { cn } from "@renderer/lib/utils";


export const openDisplayImage = (
    setDisplayOpen,
    setDisplayImage,
    e,
    image
) => {
    e.stopPropagation();
    setDisplayImage(image);
    setDisplayOpen(true);
};

const ImageDisplay = ({
    displayState,
    callbackUpdater,

    allImages,
    specificImageIndex,
    selectedImage,

    setCloseDisplayImage,
    setNextDisplayImage,
    setPrevDisplayImage,
    
    toggleSelected
}) => {
    const [displayOpen, setDisplayOpen] = displayState;

    const closeDisplay = useCallback(() => {
        setDisplayOpen(false);
        setCloseDisplayImage();
    }, []);

    const nextDisplayImage = useCallback((e) => {
        e.stopPropagation();
        setNextDisplayImage();
    }, [callbackUpdater]);

    const prevDisplayImage = useCallback((e) => {
        e.stopPropagation();
        setPrevDisplayImage();
    }, [callbackUpdater]);


    return (
        <>
        {displayOpen && 
            <div onClick={closeDisplay} className="fixed z-30 inset-0 top-8 bg-black/70 flex items-center justify-center">
                <img src={allImages[specificImageIndex]?.displayUrl} onClick={(e) => e.stopPropagation()} alt="Preview"
                    className={cn("max-h-[90%] max-w-[90%]", selectedImage && "shadow")}
                loading="lazy" />
                <Button
                    className="bg-red-700 hover:bg-red-700/90 absolute size-8 top-2 right-2"
                ><X /></Button>
                <Button variant="secondary" onClick={nextDisplayImage}
                    className="absolute right-2 size-8"
                ><ChevronRight /></Button>
                <Button variant="secondary" onClick={prevDisplayImage}
                    className="absolute left-2 size-8"
                ><ChevronLeft /></Button>
                <TGP className="absolute bottom-1">{specificImageIndex+1} / {allImages.length}</TGP>
                <Button variant="secondary" onClick={toggleSelected}
                    className={cn("absolute right-2 bottom-2 size-8",
                        selectedImage ?
                        "bg-green-500 hover:bg-green-500/90"
                        :
                        "bg-red-500 hover:bg-red-500/90"
                    )}
                >{selectedImage ? <SquareCheckBig /> : <Square />}</Button>
            </div>
        }
        </>
    );
};

export default ImageDisplay;