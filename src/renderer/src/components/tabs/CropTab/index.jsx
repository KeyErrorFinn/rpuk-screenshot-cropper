import React, { useState, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import CropImage from './CropImage';
import ImageDisplay, { openDisplayImage } from '@components/tabs/ImageDisplay';
import { Button } from '@components-ui/button';
import { ScrollArea } from "@components-ui/scroll-area";
import { Separator } from "@components-ui/separator";
import { AspectRatio } from "@components-ui/aspect-ratio";
import { Skeleton } from "@components-ui/skeleton";
import { TGP } from "@components-ui/typography";

import { cn } from "@renderer/lib/utils";
import './Crop.scss';


const CropTab = ({
    screenshots,
    selectedImages,
    setSelectedImages,
    refreshImages,
    cropScreenshots
}) => {
    const [displayImage, setDisplayImage] = useState(null);
    const [displayOpen, setDisplayOpen] = useState(false);

    const toggleSelected = useCallback((e, index) => {
        e.stopPropagation();
        setSelectedImages(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    }, []);

    const openDisplay = useCallback((e, imageIndex) => openDisplayImage(
        setDisplayOpen, setDisplayImage,
        e, imageIndex
    ), []);


    const selectedImagesLength = Object.keys(selectedImages).filter(key => selectedImages[key]).length;
    const areImagesSelected = selectedImagesLength > 0;
    const areAllImagesSelected = selectedImagesLength === screenshots?.length;
    
    const selectAllImages = useCallback((areAllImagesSelected) => {
        if (!screenshots) return;

        let toggleOption = true;
        if (areAllImagesSelected) {
            toggleOption = false;
        }

        const allSelected = screenshots.reduce((acc, _, index) => {
            acc[index] = toggleOption;
            return acc;
        }, {});

        setSelectedImages(allSelected);
    }, [screenshots, setSelectedImages]);


    return (
        <>
        <div className='relative flex my-2 mx-10 justify-center'>
            <div className='absolute items-center left-0'>
                <Button variant="secondary" className="size-fit py-0.5 px-3">
                    <TGP className="">{selectedImagesLength > 0 ?
                        `${selectedImagesLength} / ${screenshots?.length}`
                        :
                        (screenshots ? screenshots.length : "~") }
                    </TGP>
                </Button>
            </div>
            <div className='flex gap-2 items-center'>
                <Button
                    className={cn("size-fit py-1.5 px-2 hover:scale-103", areImagesSelected ? "cursor-pointer" : "cursor-not-allowed")}
                    variant={areImagesSelected ? "default" : "secondary"}
                    onClick={() => cropScreenshots(areAllImagesSelected)}
                >Crop Selected</Button>
                <Button className="size-fit py-1.5 px-2 cursor-pointer hover:scale-103" variant="outline">Crop All</Button>
            </div>
            <div className='absolute flex h-full right-0 items-center gap-2'>
                <Button variant="outline"
                    className="size-fit py-1.5 px-2 cursor-pointer hover:scale-103"
                    onClick={() => selectAllImages(areAllImagesSelected)}
                >{areAllImagesSelected ? "Unselect All" : "Select All"}</Button>
                <Button variant="outline" size="icon"
                    className="size-fit py-2 px-2 cursor-pointer hover:scale-103"
                    onClick={refreshImages}
                ><RefreshCw/></Button>
            </div>
        </div>
        <div className='px-4'>
            <Separator />
        </div>
        <ScrollArea className="my-2 overflow-hidden size-full">
            <div className="pt-0 items-center size-full justify-center flex flex-col">
                <div className="p-2 size-full justify-center">
                    <div className="grid gap-4 justify-center grid-cols-[repeat(auto-fit,minmax(150px,185px))]">
                        {screenshots === null ?
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                            :
                            screenshots.map((img, index) => (
                                <AspectRatio
                                    key={index}
                                    ratio={16 / 9}
                                    className={cn(`
                                        relative w-full overflow-hidden rounded-lg shadow-lg border-2 select-none
                                        transform transition duration-300`,
                                        !!selectedImages[index] ? "scale-105" : "hover:scale-105"
                                    )}
                                    onClick={(e) => toggleSelected(e, index)}
                                >
                                    {img ? 
                                        <CropImage
                                            index={index}
                                            image={img}
                                            openDisplay={openDisplay}
                                            selected={!!selectedImages[index]}
                                        />
                                    :
                                        <Skeleton className="size-full" />
                                    }
                                </AspectRatio>
                                )
                            )
                        }
                    </div>
                </div>
                <ImageDisplay
                    displayState={[displayOpen, setDisplayOpen]}
                    callbackUpdater={screenshots}
                    
                    allImages={screenshots}
                    specificImageIndex={displayImage}
                    selectedImage={selectedImages[displayImage]}
                    
                    setCloseDisplayImage={() => setDisplayImage(null)}
                    setNextDisplayImage={() => setDisplayImage(imageIndex => {
                        if (imageIndex === screenshots.length - 1) return 0;
                        return imageIndex+1;
                    })}
                    setPrevDisplayImage={() => setDisplayImage(imageIndex => {
                        if (imageIndex === 0) return screenshots.length - 1;
                        return imageIndex-1;
                    })}

                    toggleSelected={(e) => toggleSelected(e, displayImage)}
                />
            </div>
        </ScrollArea>
        </>
    );
};

export default React.memo(CropTab);