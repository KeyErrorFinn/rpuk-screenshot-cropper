import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings } from 'lucide-react'
import imageCompression from "browser-image-compression";   

import SettingsForm from '@components/SettingsForm'
import Crop from '@components/tabs/CropTab'
import View from '@components/tabs/ViewTab'
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

import { useSettings } from "@renderer/context/SettingsContext";


const MainScreen = () => {
    const { userSettings } = useSettings();

    const [screenshots, setScreenshots] = useState(null);
    const screenshotsCacheRef = useRef(null);
    const [selectedScreenshots, setSelectedScreenshots] = useState({})

    const [croppedFolders, setCroppedFolders] = useState({}); 
    const [openedFolders, setOpenedFolders] = useState([]);
    const croppedImagesCacheRef = useRef(null);
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
        const folderNames = await window.api.getCroppedFolders(croppedPath);

        const folders = {};
        for (const {folderName, imageCount} of folderNames) {
            folders[folderName] = { 
                loaded: false,
                opened: false,
                images: Array(imageCount).fill(null) // placeholders
            };
        }

        croppedImagesCacheRef.current = folders;
        setCroppedFolders(folders);
    }, [userSettings?.destinationFolderPath]);


    // LOAD IMAGES IN FOLDER FUNCTION ------------------------------------------
    const loadFolderImages = async (folder) => {
        if (!userSettings?.destinationFolderPath) return;

        const folderData = croppedFolders[folder];
        if (!folderData || folderData.loaded) return;

        const croppedPath = `${userSettings.destinationFolderPath}/cropped`;
        const folderImages = await window.api.getFolderImages(croppedPath, folder);

        let completed = 0;

        folderImages.forEach(async ({ buffer, name }, index) => {
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
                if (completed === folderImages.length) {
                    newFolder.loaded = true;
                }

                return {
                    ...prev,
                    [folder]: { ...newFolder, images: newImages }
                };
            });
        });
    };


    // GETS FOLDERS ON START --------------------------------------------------- 
    useEffect(() => {
        if (croppedImagesCacheRef.current && userSettings?.screenshotFolderPath) {
            setCroppedFolders(croppedImagesCacheRef.current);
            return;
        }

        if (userSettings?.destinationFolderPath) {
            getCroppedImages();
        }
    }, [getCroppedImages]);


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
                <View 
                    croppedFolders={croppedFolders}
                    loadFolderImages={loadFolderImages}
                    openedFolders={openedFolders}
                    setOpenedFolders={setOpenedFolders}
                    selectedImages={selectedCroppedImages}
                    setSelectedImages={setSelectedCroppedImages}
                />
            </TabsContent>
        </Tabs>
        </>
    )
}

export default MainScreen