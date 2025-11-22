import React, { useState, useCallback } from 'react';
import {
    Loader2,
    X,
    ChevronRight,
    ChevronLeft,
    Square,
    SquareCheckBig, 
    RefreshCw
} from 'lucide-react';

import CropImage from './CropImage';
import { Button } from '@components-ui/button';
import { ScrollArea } from "@components-ui/scroll-area"
import { Separator } from "@components-ui/separator"
import { AspectRatio } from "@components-ui/aspect-ratio"
import { Skeleton } from "@components-ui/skeleton"
import { TGP } from "@components-ui/typography"

import { cn } from "@renderer/lib/utils"
import './Crop.scss'

const Crop = ({
    screenshots,
    selectedImages,
    setSelectedImages,
    refreshImages
}) => {
    const [displayImage, setDisplayImage] = useState(null)
    const [displayOpen, setDisplayOpen] = useState(false)

    const toggleSelected = useCallback((e, index) => {
        e.stopPropagation()
        setSelectedImages(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
        console.log(selectedImages)
    }, []);

    const openDisplay = useCallback((e, imageIndex) => {
        e.stopPropagation()
        setDisplayImage(imageIndex)
        setDisplayOpen(true)
    }, []);

    const closeDisplay = useCallback((e, image) => {
        setDisplayOpen(false)
        setDisplayImage(null)
    }, []);

    const nextDisplayImage = useCallback((e) => {
        e.stopPropagation()
        setDisplayImage(imageIndex => {
            if (imageIndex === screenshots.length - 1) return 0
            return imageIndex+1
        })
    }, [screenshots]);

    const prevDisplayImage = useCallback((e) => {
        e.stopPropagation()
        setDisplayImage(imageIndex => {
            if (imageIndex === 0) return screenshots.length - 1
            return imageIndex-1
        })
    }, [screenshots]);


    const selectedImagesLength = Object.keys(selectedImages).filter(key => selectedImages[key]).length;
    const areImagesSelected = selectedImagesLength > 0
    const areAllImagesSelected = selectedImagesLength === screenshots?.length
    
    const selectAllImages = useCallback((areAllImagesSelected) => {
        if (!screenshots) return;

        let toggleOption = true
        if (areAllImagesSelected) {
            toggleOption = false
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
                    <div className="grid gap-4 justify-center grid-cols-[repeat(auto-fit,minmax(150px,200px))]">
                        {screenshots === null ?
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                            :
                            screenshots.map((img, index) => (
                                img ? 
                                    <CropImage
                                        key={index}
                                        index={index}
                                        image={img}
                                        openDisplay={openDisplay}
                                        selected={!!selectedImages[index]}
                                        toggleSelected={toggleSelected}
                                    />
                                : 
                                    <AspectRatio
                                        key={index}
                                        ratio={16 / 9}
                                        className="
                                            relative w-full overflow-hidden rounded-lg shadow-lg border-2
                                            transform transition duration-300"
                                    ><Skeleton className="size-full" /></AspectRatio>
                            ))
                        }
                    </div>
                </div>
                {displayOpen && 
                    <div onClick={closeDisplay} className="fixed z-30 inset-0 top-8 bg-black/70 flex items-center justify-center">
                        <img src={screenshots[displayImage].displayUrl} onClick={(e) => e.stopPropagation()} alt="Preview"
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
                        <TGP className="absolute bottom-1">{displayImage+1} / {screenshots.length}</TGP>
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
            </div>
        </ScrollArea>

            {/* <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />

            <Card className="min-w-md p-3">
                <h3 className="text-lg font-bold">Card Title</h3>
                <p className="text-sm text-gray-600">This is a card description.</p>
                <Button className="mt-2">Card Action</Button>
            </Card>

            <Toggle className="bg-green-500" />

            <Accordion type="single" collapsible className="w-md">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Accordion Item 1</AccordionTrigger>
                    <AccordionContent>
                        This is the content of the first accordion item.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Accordion Item 2</AccordionTrigger>
                    <AccordionContent>
                        Content for the second item.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button>Open Alert</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end space-x-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Confirm</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog> */}
        </>
    )
};

export default React.memo(Crop)