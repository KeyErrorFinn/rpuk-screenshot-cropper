import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings } from 'lucide-react'
import imageCompression from "browser-image-compression";   

import SettingsForm from '@components/SettingsForm'
import Crop from '@components/Crop'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@components-ui/tabs"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@components-ui/sheet"
import { Separator } from "@components-ui/separator"
import { Button } from '@components-ui/button';
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent
} from '@components-ui/accordion';
import { AspectRatio } from "@components-ui/aspect-ratio"

import { useSettings } from "@renderer/context/SettingsContext";


const MainScreen = () => {
    const { userSettings } = useSettings();

    const [loadingScreenshots, setLoadingScreenshots] = useState(true);
    const [screenshots, setScreenshots] = useState(null);
    const screenshotsCacheRef = useRef(null);
    const [selectedScreenshots, setSelectedScreenshots] = useState({})

    const croppedImagesCacheRef = useRef(null);
    const [croppedFolders, setCroppedFolders] = useState({}); 
    const [selectedCroppedImages, setSelectedCroppedImages] = useState({});


    /************************************************************************** 
     *                              SCREENSHOTS                               * 
     **************************************************************************/
    // GET SCREENSHOTS FUNCTION ------------------------------------------------ 
    const getScreenshots = useCallback(async () => {
        setScreenshots(null)
        const receivedScreenshots = await window.api.getScreenshots(userSettings.screenshotFolderPath);
        setScreenshots(receivedScreenshots.map(() => null));

        let completed = 0;

        receivedScreenshots.forEach(async ({ buffer }, index) => {
            const blob = new Blob([buffer.buffer], { type: "image/*" });

            const compressed = await imageCompression(blob, {
                maxWidthOrHeight: 200,
                useWebWorker: false,
                fileType: "image/webp",
            });

            setScreenshots(prev => {
                const newArr = [...prev];
                newArr[index] = {
                    basicUrl: URL.createObjectURL(compressed),
                    displayUrl: URL.createObjectURL(blob),
                    selected: false,
                    toggleSelected: null,
                };
                screenshotsCacheRef.current = newArr;
                return newArr;
            });

            completed++;
            if (completed === receivedScreenshots.length) {
                setLoadingScreenshots(false);
            }
        });
    }, [userSettings?.screenshotFolderPath])
    

    // GETS SCREENSHOTS ON START -----------------------------------------------
    useEffect(() => {
        if (!userSettings?.screenshotFolderPath) return;

        if (screenshotsCacheRef.current) {
            setScreenshots(screenshotsCacheRef.current);
            return;
        }

        getScreenshots()
    }, [getScreenshots]);


    // REFRESHES SCREENSHOTS ---------------------------------------------------
    const refreshScreenshots = () => {
        setSelectedScreenshots({})
        screenshotsCacheRef.current = null;
        getScreenshots();
    }


    /************************************************************************** 
     *                             CROPPED IMAGES                             * 
     **************************************************************************/
    // GET CROPPED IMAGE FOLDERS FUNCTION ---------------------------------------------
    const getCroppedImages = useCallback(async () => {
        if (!userSettings?.destinationFolderPath) return;

        const croppedPath = `${userSettings.destinationFolderPath}/cropped`;

        const imagesByDate = await window.api.getCroppedImages(croppedPath);

        // Store folder with placeholders upfront
        const folders = {};
        for (const [folder, images] of Object.entries(imagesByDate)) {
            folders[folder] = { 
                loaded: false, 
                raw: images, 
                images: Array(images.length).fill(null) // placeholders
            };
        }

        croppedImagesCacheRef.current = folders;
        setCroppedFolders(folders);
    }, [userSettings?.destinationFolderPath]);
    // const getCroppedImages = useCallback(async () => {
    //     if (!userSettings?.destinationFolderPath) return;

    //     const croppedPath = `${userSettings.destinationFolderPath}/cropped`;

    //     const imagesByDate = await window.api.getCroppedImages(croppedPath);

    //     // Just store folder + empty placeholder, not processed images
    //     const folders = {};
    //     for (const [folder, images] of Object.entries(imagesByDate)) {
    //         folders[folder] = { loaded: false, raw: images, images: [] };
    //     }

    //     croppedImagesCacheRef.current = folders;
    //     setCroppedFolders(folders);
    // }, [userSettings?.destinationFolderPath]);



    // LOAD IMAGES IN FOLDER FUNCTION ------------------------------------------
    const loadFolderImages = async (folder) => {
        const folderData = croppedFolders[folder];
        if (!folderData || folderData.loaded) return;

        let completed = 0;

        folderData.raw.forEach(async ({ buffer, name }, index) => {
            const blob = new Blob([buffer.buffer], { type: "image/*" });
            const compressed = await imageCompression(blob, {
                maxWidthOrHeight: 200,
                useWebWorker: false,
                fileType: "image/webp",
            });

            setCroppedFolders(prev => {
                const newFolder = { ...prev[folder] };
                const newImages = [...newFolder.images];
                newImages[index] = {
                    name,
                    basicUrl: URL.createObjectURL(compressed),
                    displayUrl: URL.createObjectURL(blob),
                    selected: false,
                    toggleSelected: null,
                };

                completed++;
                if (completed === folderData.raw.length) {
                    newFolder.loaded = true;
                }

                return {
                    ...prev,
                    [folder]: { ...newFolder, images: newImages }
                };
            });
        });
    };
    // const loadFolderImages = async (folder) => {
    //     const folderData = croppedFolders[folder];
    //     if (!folderData || folderData.loaded) return; // already loaded

    //     const processed = await Promise.all(
    //         folderData.raw.map(async ({ buffer, name }) => {
    //             const blob = new Blob([buffer.buffer], { type: "image/*" });
    //             const compressed = await imageCompression(blob, {
    //                 maxWidthOrHeight: 200,
    //                 useWebWorker: false,
    //                 fileType: "image/webp",
    //             });
    //             return {
    //                 name,
    //                 basicUrl: URL.createObjectURL(compressed),
    //                 displayUrl: URL.createObjectURL(blob),
    //                 selected: false,
    //                 toggleSelected: null,
    //             };
    //         })
    //     );

    //     setCroppedFolders(prev => ({
    //         ...prev,
    //         [folder]: { ...folderData, loaded: true, images: processed }
    //     }));
    // };


    // GETS FOLDERS ON START --------------------------------------------------- 
    useEffect(() => {
        if (!userSettings?.destinationFolderPath) return;

        if (croppedImagesCacheRef.current) {
            setCroppedFolders(croppedImagesCacheRef.current);
            return;
        }

        if (!loadingScreenshots && userSettings?.destinationFolderPath) {
            getCroppedImages();
        }
    }, [loadingScreenshots, getCroppedImages]);


    // REFRESHES CROPPED IMAGES ------------------------------------------------ 
    const refreshCroppedImages = () => {
        setSelectedCroppedImages({});
        croppedImagesCacheRef.current = null;
        getCroppedImages();
    };
    
    
    return (
        <>
        <Tabs defaultValue="crop" className="w-full gap-0 overflow-hidden items-center pt-2">
            <Sheet>
                <SheetTrigger className="absolute right-4 cursor-pointer hover:scale-103" asChild>
                    <Button variant="secondary" size="icon" onClick={(e) => e.currentTarget.blur()}>
                        <Settings />
                    </Button>
                </SheetTrigger>
                <SheetContent onOpenAutoFocus={(e) => { e.preventDefault() }}>
                    <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription />
                    </SheetHeader>
                    <SettingsForm formID="settings-form" className="px-4" />
                    <SheetFooter>
                        <Button type="submit" form="settings-form">Save changes</Button>
                        <SheetClose asChild>
                            <Button variant="outline">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            <TabsList className="mb-2">
                <TabsTrigger value="crop" className="cursor-pointer">Crop</TabsTrigger>
                <TabsTrigger value="view" className="cursor-pointer">View</TabsTrigger>
            </TabsList>
            <div className='w-full px-4'>
                <Separator />
            </div>
            <TabsContent value="crop" className="size-full overflow-hidden px-6 flex flex-col">
                <Crop
                    screenshots={screenshots}
                    selectedImages={selectedScreenshots}
                    setSelectedImages={setSelectedScreenshots}
                    refreshImages={refreshScreenshots}
                />
            </TabsContent>
            <TabsContent value="view" className="size-full overflow-hidden px-6">
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
            </TabsContent>
        </Tabs>
        </>
    )
}

export default MainScreen