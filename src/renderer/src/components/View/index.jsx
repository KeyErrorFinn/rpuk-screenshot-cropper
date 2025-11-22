import React from 'react';

import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent
} from '@components-ui/accordion';
import { AspectRatio } from "@components-ui/aspect-ratio"


const View = ({ croppedFolders, loadFolderImages }) => {

    return (
        <Accordion 
            type="multiple" 
            className="w-full"
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
                            <div className="grid gap-4 justify-center grid-cols-[repeat(auto-fit,minmax(150px,200px))]">
                                {data.images.map((img, idx) => (
                                    <AspectRatio
                                        key={idx}
                                        ratio={16 / 9}
                                        className="rounded-lg shadow border bg-muted animate-pulse"
                                    >
                                        {img ? (
                                            <img
                                                src={img.basicUrl}
                                                alt={img.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted" />
                                        )}
                                    </AspectRatio>
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
};

export default React.memo(View)