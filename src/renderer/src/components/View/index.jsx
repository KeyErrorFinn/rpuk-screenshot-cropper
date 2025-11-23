import React, { useState, useCallback } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Square,
    SquareCheckBig
} from 'lucide-react';

import ViewImage from './ViewImage'
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent
} from '@components-ui/accordion';
import { AspectRatio } from "@components-ui/aspect-ratio"
import { ScrollArea } from "@components-ui/scroll-area"
import { Skeleton } from "@components-ui/skeleton"
import { Button } from '@components-ui/button';
import { TGP } from "@components-ui/typography"

import { cn } from "@renderer/lib/utils"
import { fa } from 'zod/v4/locales';


const View = ({
    croppedFolders,
    loadFolderImages,
    openedFolders,
    setOpenedFolders,
    selectedImages,
    setSelectedImages
}) => {
    const [displayImage, setDisplayImage] = useState({folder: null, index: null})
    const [displayOpen, setDisplayOpen] = useState(false)
    
    const toggleSelected = useCallback((e, folder, index) => {
        e.stopPropagation()
        setSelectedImages(prev => ({
            ...prev,
            [folder]: {
                ...(prev[folder] || {}),
                [index]: !((prev[folder] || {})[index])
            }
        }))
    }, []);

    const openDisplay = useCallback((e, folder, imageIndex) => {
        e.stopPropagation()
        setDisplayImage({folder: folder, index: imageIndex})
        setDisplayOpen(true)
    }, []);

    const closeDisplay = useCallback(() => {
        setDisplayOpen(false)
        setDisplayImage({folder: null, index: null})
    }, []);

    const nextDisplayImage = useCallback((e) => {
        e.stopPropagation()
        setDisplayImage(prev => {
            if (prev.index === croppedFolders[prev.folder]["images"].length - 1) return {folder: prev.folder, index: 0}
            return {folder: prev.folder, index: prev.index+1}
        })
    }, [croppedFolders]);

    const prevDisplayImage = useCallback((e) => {
        e.stopPropagation()
        setDisplayImage(prev => {
            if (prev.index === 0) return {folder: prev.folder, index: croppedFolders[prev.folder]["images"].length - 1}
            return {folder: prev.folder, index: prev.index-1}
        })
    }, [croppedFolders]);
 

    return (
        <ScrollArea className="my-2 overflow-hidden size-full">
            <Accordion 
                type="multiple" 
                className="w-full pr-4"
                onValueChange={(newOpenedFolders) => {
                    // find which folder was just clicked
                    const newlyOpened = newOpenedFolders.find(f => !openedFolders.includes(f));
                    const newlyClosed = openedFolders.find(f => !newOpenedFolders.includes(f));

                    if (newlyOpened) {
                        loadFolderImages(newlyOpened);
                    };

                    setOpenedFolders(newOpenedFolders);
                }}
                defaultValue={openedFolders}
            >
                {Object.entries(croppedFolders).map(([folder, data]) => (
                    <AccordionItem key={folder} value={folder}>
                        <AccordionTrigger>{folder}</AccordionTrigger>
                        <AccordionContent>
                            {data.images.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No images</p>
                            ) : (
                                <div className="grid gap-4 justify-center grid-cols-[repeat(auto-fit,minmax(150px,190px))]">
                                    {data.images.map((img, index) => (
                                        <AspectRatio
                                            key={index}
                                            ratio={16 / 9}
                                            className={cn(`
                                                relative w-full overflow-hidden rounded-lg shadow-lg border-2 select-none
                                                transform transition duration-300`,
                                                !!selectedImages[folder]?.[index] ? "scale-105" : "hover:scale-105"
                                            )}
                                            onClick={(e) => toggleSelected(e, folder, index)}
                                        >
                                            {img ? (
                                                <ViewImage
                                                    index={index}
                                                    folder={folder}
                                                    image={img}
                                                    openDisplay={openDisplay}
                                                    selected={!!selectedImages[folder]?.[index]}
                                                />
                                            ) : (
                                                <Skeleton className="size-full" />
                                            )}
                                        </AspectRatio>
                                    ))}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {displayOpen && 
                <div onClick={closeDisplay} className="fixed z-30 inset-0 top-8 bg-black/70 flex items-center justify-center">
                    <img src={croppedFolders[displayImage.folder]["images"][displayImage.index]?.displayUrl} onClick={(e) => e.stopPropagation()} alt="Preview"
                        className={cn("max-h-[90%] max-w-[90%]", selectedImages[displayImage] && "shadow")}
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
                    <TGP className="absolute bottom-1">{displayImage.index+1} / {croppedFolders[displayImage.folder]["images"].length}</TGP>
                    <Button variant="secondary" onClick={(e) => toggleSelected(e, displayImage)}
                        className={cn("absolute right-2 bottom-2 size-8",
                            selectedImages[displayImage] ?
                            "bg-green-500 hover:bg-green-500/90"
                            :
                            "bg-red-500 hover:bg-red-500/90"
                        )}
                    >{selectedImages[displayImage] ? <SquareCheckBig /> : <Square />}</Button>
                </div>
            }
        </ScrollArea>
    )
};

export default React.memo(View)