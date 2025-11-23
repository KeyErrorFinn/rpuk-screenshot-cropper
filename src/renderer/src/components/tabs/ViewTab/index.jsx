import React, { useState, useCallback } from 'react';

import ViewImage from './ViewImage'
import ImageDisplay, { openDisplayImage } from '@components/tabs/ImageDisplay'
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent
} from '@components-ui/accordion';
import { AspectRatio } from "@components-ui/aspect-ratio"
import { ScrollArea } from "@components-ui/scroll-area"
import { Skeleton } from "@components-ui/skeleton"

import { cn } from "@renderer/lib/utils"


const ViewTab = ({
    croppedFolders,
    loadFolderImages,
    openedFolders,
    setOpenedFolders,
    selectedImages,
    setSelectedImages
}) => {
    const [displayOpen, setDisplayOpen] = useState(false)
    const [displayImage, setDisplayImage] = useState({folder: null, index: null})
    
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

    const openDisplay = useCallback((e, folder, imageIndex) => openDisplayImage(
        setDisplayOpen, setDisplayImage,
        e, {folder: folder, index: imageIndex}
    ), []);


    return (
        <ScrollArea className="my-2 overflow-hidden size-full">
            <Accordion 
                type="multiple" 
                className="w-full pr-4"
                onValueChange={(newOpenedFolders) => {
                    // find which folder was just clicked
                    const newlyOpened = newOpenedFolders.find(f => !openedFolders.includes(f));

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
            <ImageDisplay
                displayState={[displayOpen, setDisplayOpen]}
                callbackUpdater={croppedFolders}
                
                allImages={croppedFolders[displayImage.folder]?.images}
                specificImageIndex={displayImage.index}
                selectedImage={selectedImages[displayImage.folder]?.[displayImage.index]}
                
                setCloseDisplayImage={() => setDisplayImage({folder: null, index: null})}
                setNextDisplayImage={() => setDisplayImage(prev => {
                    if (prev.index === croppedFolders[prev.folder].images.length - 1) return {folder: prev.folder, index: 0}
                    return {folder: prev.folder, index: prev.index+1}
                })}
                setPrevDisplayImage={() => setDisplayImage(prev => {
                    if (prev.index === 0) return {folder: prev.folder, index: croppedFolders[prev.folder]["images"].length - 1}
                    return {folder: prev.folder, index: prev.index-1}
                })}

                toggleSelected={(e) => toggleSelected(e, displayImage.folder, displayImage.index)}
            />
        </ScrollArea>
    )
};

export default React.memo(ViewTab)