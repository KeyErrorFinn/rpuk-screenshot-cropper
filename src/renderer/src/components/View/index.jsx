import React from 'react';

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


const View = ({ croppedFolders, loadFolderImages }) => {

    return (
        <ScrollArea className="my-2 overflow-hidden size-full">
            <Accordion 
                type="multiple" 
                className="w-full pr-4"
                onValueChange={(openFolders) => {
                    openFolders.forEach(folder => loadFolderImages(folder));
                }}
            >
                {Object.entries(croppedFolders).map(([folder, data]) => (
                    <AccordionItem key={folder} value={folder}>
                        <AccordionTrigger>{folder}</AccordionTrigger>
                        <AccordionContent>
                            {data.images.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No images</p>
                            ) : (
                                <div className="grid gap-4 justify-center grid-cols-[repeat(auto-fit,minmax(150px,190px))]">
                                    {data.images.map((img, idx) => (
                                        <AspectRatio
                                            key={idx}
                                            ratio={16 / 9}
                                            className={cn(`
                                                relative w-full overflow-hidden rounded-lg shadow-lg border-2 select-none
                                                transform transition duration-300`,
                                                // !!selectedImages[index] ? "scale-105" : "hover:scale-105"
                                            )}
                                        >
                                            {img ? (
                                                <img
                                                    src={img.basicUrl}
                                                    alt={img.name}
                                                    className="gallery-image size-full object-cover select-none"
                                                    loading="lazy"
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
        </ScrollArea>
    )
};

export default React.memo(View)