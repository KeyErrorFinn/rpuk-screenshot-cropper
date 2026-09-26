import { useCallback, useEffect, useRef, useState } from "react";
import { ListTodo, Settings, X } from "lucide-react";
import { toast } from "sonner";
import SettingsForm from "@components/SettingsForm";
import Crop from "@components/tabs/CropTab";
import View from "@components/tabs/ViewTab";
import CropArea from "@components/tabs/CropAreaTab";
import { useSettings } from "@renderer/context/SettingsContext";
import { reconcileCroppedFolderSummaries } from "@renderer/lib/croppedFolders";
import { createObjectUrlCache } from "@renderer/lib/objectUrlCache";
import ActivityCenter from "@components/ActivityCenter";
import { useActivityCenter } from "@renderer/hooks/useActivityCenter";
import { useWorkspacePreferences } from "@renderer/hooks/useWorkspacePreferences";
import { useAppVersion } from "@renderer/hooks/useAppVersion";
import { getImageSelectionId, pruneStableSelection, remapIndexSelection } from "@renderer/lib/selection";

const MainScreen = () => {
    const appVersion = useAppVersion();
    const { userSettings } = useSettings();
    const { activeTab, setActiveTab, galleryColumns, setGalleryColumns, viewFilter, setViewFilter, openedFolders, setOpenedFolders } = useWorkspacePreferences();
    const activity = useActivityCenter();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [screenshots, setScreenshots] = useState(null);
    const screenshotsCacheRef = useRef(null);
    const [selectedScreenshots, setSelectedScreenshots] = useState({});
    const [croppedFolders, setCroppedFolders] = useState({});
    const croppedImagesCacheRef = useRef(null);
    const [selectedCroppedImages, setSelectedCroppedImages] = useState({});
    const [uploadingToGyazo, setUploadingToGyazo] = useState(false);
    const [cropping, setCropping] = useState(false);
    const [undoingCrop, setUndoingCrop] = useState(false);
    const [refreshingScreenshots, setRefreshingScreenshots] = useState(false);
    const [refreshingLibrary, setRefreshingLibrary] = useState(false);
    const [newCroppedImages, setNewCroppedImages] = useState({});
    const [restoredSourceImages, setRestoredSourceImages] = useState({});
    const [walkthroughStep, setWalkthroughStep] = useState(null);
    const fullImageUrlsRef = useRef(createObjectUrlCache({ limit: 24 }));
    const thumbnailUrlsRef = useRef(createObjectUrlCache({ limit: 320 }));
    const thumbnailLoadsRef = useRef(new Map());
    const sourceRefreshTimerRef = useRef(null);
    const croppedRefreshTimerRef = useRef(null);
    const refreshScreenshotsRef = useRef(null);
    const refreshCroppedImagesRef = useRef(null);

    const updateCroppedFolders = useCallback(update => {
        setCroppedFolders(previous => {
            const next = typeof update === "function" ? update(previous) : update;
            croppedImagesCacheRef.current = next;
            return next;
        });
    }, []);

    const createImageUrl = (buffer, type) => URL.createObjectURL(new Blob([buffer], { type }));
    const beginActivity = activity.begin;
    const finishActivity = activity.finish;
    const changeTab = value => {
        if (activeTab === "crop-area" && window.__cropEditorDirty && !window.confirm("Discard unsaved crop-area changes?")) return;
        setActiveTab(value);
    };

    useEffect(() => { window.api.getPreference("walkthroughComplete").then(complete => { if (!complete) setWalkthroughStep(0); }); }, []);
    useEffect(() => { window.api.getPreference("cropRecoveryNotice").then(notice => { if (notice) { if (notice.errors?.length) toast.error(`Could not fully restore ${notice.errors[0].filename}: ${notice.errors[0].error}`); else toast.info("An interrupted crop batch was safely restored"); window.api.setPreference("cropRecoveryNotice", false); } }); }, []);
    useEffect(() => {
        if (!userSettings.gyazoAccessToken) return;
        window.api.getPendingUpload().then(async pending => {
            if (!pending?.selectedImages?.length) return;
            toast.info("Resuming interrupted Gyazo upload");
            const result = await window.api.uploadToGyazo(pending.outputPath, userSettings.gyazoAccessToken, pending.selectedImages);
            if (result.uploaded.length) toast.success(`Restored upload completed for ${result.uploaded.length} image${result.uploaded.length === 1 ? "" : "s"}`);
            refreshCroppedImagesRef.current?.();
        }).catch(error => toast.error(`Could not resume upload: ${error.message}`));
    }, [userSettings.gyazoAccessToken]);

    const getImageMimeType = filename => {
        const extension = filename.split(".").pop()?.toLowerCase();
        if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
        if (extension === "webp") return "image/webp";
        return "image/png";
    };

    const loadFullImage = useCallback(async (key, loader) => {
        if (fullImageUrlsRef.current.has(key)) return fullImageUrlsRef.current.get(key);
        const buffer = await loader();
        if (!buffer) return null;
        const url = createImageUrl(buffer, getImageMimeType(key));
        fullImageUrlsRef.current.set(key, url);
        return url;
    }, []);

    const loadSourceImage = useCallback(filename => loadFullImage(
        `source:${userSettings.screenshotFolderPath}:${filename}`,
        () => window.api.getSourceImage(userSettings.screenshotFolderPath, filename),
    ), [loadFullImage, userSettings?.screenshotFolderPath]);

    const loadCroppedImage = useCallback((folder, filename) => loadFullImage(
        `cropped:${userSettings.destinationFolderPath}:${folder}:${filename}`,
        () => window.api.getCroppedImage(userSettings.destinationFolderPath, folder, filename),
    ), [loadFullImage, userSettings?.destinationFolderPath]);

    const loadThumbnail = useCallback(async (key, loader) => {
        if (thumbnailUrlsRef.current.has(key)) return thumbnailUrlsRef.current.get(key);
        if (thumbnailLoadsRef.current.has(key)) return thumbnailLoadsRef.current.get(key);
        const pending = Promise.resolve(loader()).then(buffer => {
            if (!buffer) return null;
            const url = createImageUrl(buffer, "image/webp");
            thumbnailUrlsRef.current.set(key, url);
            return url;
        }).finally(() => thumbnailLoadsRef.current.delete(key));
        thumbnailLoadsRef.current.set(key, pending);
        return pending;
    }, []);

    const loadSourceThumbnail = useCallback((filename, fingerprint) => loadThumbnail(
        `source:${userSettings.screenshotFolderPath}:${filename}:${fingerprint || "unknown"}`,
        () => window.api.getSourceThumbnail(userSettings.screenshotFolderPath, filename),
    ), [loadThumbnail, userSettings?.screenshotFolderPath]);

    const loadCroppedThumbnail = useCallback((folder, filename, fingerprint) => loadThumbnail(
        `cropped:${userSettings.destinationFolderPath}:${folder}:${filename}:${fingerprint || "unknown"}`,
        () => window.api.getCroppedThumbnail(userSettings.destinationFolderPath, folder, filename),
    ), [loadThumbnail, userSettings?.destinationFolderPath]);

    useEffect(() => () => {
        fullImageUrlsRef.current.clear();
        thumbnailUrlsRef.current.clear();
    }, []);

    const getScreenshots = useCallback(async () => {
        const previousImages = screenshotsCacheRef.current || [];
        try {
            const received = await window.api.getScreenshots(userSettings.screenshotFolderPath);
            const images = received.map(({ name, fingerprint, width, height }) => {
                const thumbnailKey = `source:${userSettings.screenshotFolderPath}:${name}:${fingerprint || "unknown"}`;
                return { name, fingerprint, width, height, basicUrl: thumbnailUrlsRef.current.get(thumbnailKey), loadThumbnail: () => loadSourceThumbnail(name, fingerprint) };
            });
            screenshotsCacheRef.current = images;
            setScreenshots(images);
            setSelectedScreenshots(previous => remapIndexSelection(previousImages, images, previous));
        } catch (error) {
            setScreenshots([]);
            toast.error(`Screenshot folder is unavailable: ${error.message}`);
        }
    }, [loadSourceThumbnail, userSettings?.screenshotFolderPath]);

    useEffect(() => {
        if (!userSettings?.screenshotFolderPath) return;
        if (screenshotsCacheRef.current) setScreenshots(screenshotsCacheRef.current);
        else getScreenshots();
    }, [getScreenshots, userSettings?.screenshotFolderPath]);

    const refreshScreenshots = async () => {
        setRefreshingScreenshots(true);
        try { await getScreenshots(); }
        finally { setRefreshingScreenshots(false); }
    };
    refreshScreenshotsRef.current = refreshScreenshots;

    const importImages = async files => {
        const suppliedFiles = files ? Array.from(files) : null;
        const activityId = beginActivity(suppliedFiles ? `Importing ${suppliedFiles.length} image${suppliedFiles.length === 1 ? "" : "s"}` : "Importing image from clipboard", undefined, "session");
        try {
            const result = suppliedFiles ? await window.api.importImageFiles(suppliedFiles) : await window.api.importClipboardImage();
            if (result.imported.length) { toast.success(`${result.imported.length} image${result.imported.length === 1 ? "" : "s"} imported`); refreshScreenshots(); }
            if (result.failed.length) {
                const failedNames = new Set(result.failed.map(item => item.filename));
                activity.setRetry(activityId, () => importImages(suppliedFiles ? suppliedFiles.filter(file => failedNames.has(file.name)) : null));
                finishActivity(activityId, "failed", `${result.failed[0].filename}: ${result.failed[0].error}`);
                toast.error(`${result.failed[0].filename}: ${result.failed[0].error}`);
            } else finishActivity(activityId, "complete", `${result.imported.length} imported`);
        } catch (error) {
            activity.setRetry(activityId, () => importImages(suppliedFiles));
            finishActivity(activityId, "failed", error.message);
            toast.error(error.message);
        }
    };

    const cropScreenshots = async (all = false) => {
        if (cropping || !userSettings?.destinationFolderPath || !userSettings?.screenshotFolderPath || !screenshots) return;
        const filenames = all
            ? screenshots.filter(Boolean).map(image => image.name)
            : Object.entries(selectedScreenshots).filter(([, selected]) => selected).map(([index]) => screenshots[index]?.name).filter(Boolean);
        if (!filenames.length) return;
        const activityId = beginActivity(`Cropping ${filenames.length} image${filenames.length === 1 ? "" : "s"}`, filenames.slice(0, 3).join(", "), "session", () => cropScreenshots(all));
        setCropping(true);
        try {
            const result = await window.api.cropScreenshots(userSettings.screenshotFolderPath, userSettings.destinationFolderPath, userSettings.keepOriginalImage, filenames, {
                cropInsets: userSettings.cropInsets,
                cropPresets: userSettings.cropPresets || {},
            });
            if (result?.success || result === true) {
                finishActivity(activityId, "complete", `${filenames.length} image${filenames.length === 1 ? "" : "s"} cropped safely`);
                refreshScreenshots();
                croppedImagesCacheRef.current = null;
                await getCroppedImages();
                if (result?.croppedImages) {
                    setNewCroppedImages(previous => result.croppedImages.reduce((next, image) => ({
                        ...next,
                        [image.folder]: { ...(next[image.folder] || {}), [image.name]: true },
                    }), { ...previous }));
                }
            } else if (result?.errors?.length) {
                finishActivity(activityId, "failed", result.errors[0].error);
                toast.error(`Could not crop ${result.errors[0].filename}: ${result.errors[0].error}`);
            }
        } catch (error) {
            finishActivity(activityId, "failed", error.message);
            toast.error(`Crop batch could not be completed: ${error.message}`);
        } finally {
            setCropping(false);
        }
    };

    const undoLastCrop = async () => {
        if (undoingCrop) return;
        const activityId = beginActivity("Restoring crop batch", undefined, "session", undoLastCrop);
        setUndoingCrop(true);
        try {
            const result = await window.api.undoLastCrop();
            if (!result.success) {
                finishActivity(activityId, "failed", result.reason || result.errors?.[0]?.error);
                toast.error(result.reason || result.errors?.[0]?.error || "Could not undo crop batch");
                return;
            }
            setRestoredSourceImages(previous => Object.fromEntries([
                ...Object.entries(previous),
                ...(result.restoredImages || []).map(image => [image.name, true]),
            ]));
            await Promise.all([refreshScreenshots(), refreshCroppedImages()]);
            finishActivity(activityId, "complete", "Source images restored and outputs moved to Recycle Bin");
            toast.success("Last batch restored");
        } catch (error) {
            finishActivity(activityId, "failed", error.message);
            toast.error(`Could not restore crop batch: ${error.message}`);
        } finally {
            setUndoingCrop(false);
        }
    };

    const getCroppedImages = useCallback(async () => {
        if (!userSettings?.destinationFolderPath) return;
        try {
            const folderNames = await window.api.getCroppedFolders(userSettings.destinationFolderPath);
            updateCroppedFolders(previous => reconcileCroppedFolderSummaries(previous, folderNames));
        } catch (error) {
            updateCroppedFolders({});
            toast.error(`Cropped-image folder is unavailable: ${error.message}`);
        }
    }, [updateCroppedFolders, userSettings?.destinationFolderPath]);

    const loadFolderImages = async (folder) => {
        const folderData = croppedFolders[folder];
        if (!userSettings?.destinationFolderPath || !folderData || folderData.loaded) return;
        const images = await window.api.getFolderImages(userSettings.destinationFolderPath, folder);
        const loadedImages = images.map(({ name, fingerprint, id, width, height, gyazoUrl, favourite, tags }) => {
            const thumbnailKey = `cropped:${userSettings.destinationFolderPath}:${folder}:${name}:${fingerprint || "unknown"}`;
            return { name, fingerprint, id, width, height, gyazoUrl, favourite, tags, basicUrl: thumbnailUrlsRef.current.get(thumbnailKey), loadThumbnail: () => loadCroppedThumbnail(folder, name, fingerprint) };
        }).sort((a, b) => Number(b.favourite) - Number(a.favourite));
        updateCroppedFolders(previous => ({ ...previous, [folder]: { ...previous[folder], loaded: true, uploadedCount: loadedImages.filter(image => image.gyazoUrl).length, images: loadedImages } }));
        setSelectedCroppedImages(previous => {
            if (!previous[folder]) return previous;
            const folderSelection = pruneStableSelection(previous[folder], loadedImages);
            if (Object.keys(folderSelection).length === Object.keys(previous[folder]).filter(key => previous[folder][key]).length) return previous;
            const next = { ...previous };
            if (Object.keys(folderSelection).length) next[folder] = folderSelection;
            else delete next[folder];
            return next;
        });
        return loadedImages;
    };

    useEffect(() => {
        if (croppedImagesCacheRef.current) setCroppedFolders(croppedImagesCacheRef.current);
        else getCroppedImages();
    }, [getCroppedImages]);

    const refreshCroppedImages = async () => {
        setRefreshingLibrary(true);
        croppedImagesCacheRef.current = null;
        try { await getCroppedImages(); }
        finally { setRefreshingLibrary(false); }
    };
    refreshCroppedImagesRef.current = refreshCroppedImages;

    useEffect(() => {
        const stopSource = window.api.onSourceFolderChanged(() => { clearTimeout(sourceRefreshTimerRef.current); sourceRefreshTimerRef.current = setTimeout(() => refreshScreenshotsRef.current?.(), 200); });
        const stopCropped = window.api.onCroppedFolderChanged(() => { clearTimeout(croppedRefreshTimerRef.current); croppedRefreshTimerRef.current = setTimeout(() => refreshCroppedImagesRef.current?.(), 250); });
        const stopWarnings = window.api.onImageWarning(warning => toast.error(warning.message));
        return () => { stopSource(); stopCropped(); stopWarnings(); clearTimeout(sourceRefreshTimerRef.current); clearTimeout(croppedRefreshTimerRef.current); };
    }, []);

    const copySourceImage = filename => {
        window.api.copySourceImage(userSettings.screenshotFolderPath, filename);
        toast.success("Image copied to clipboard");
    };

    const copyCroppedImage = (folder, filename) => {
        window.api.copyCroppedImage(userSettings.destinationFolderPath, folder, filename);
        toast.success("Image copied to clipboard");
    };

    const openCroppedFolder = folder => {
        window.api.openCroppedFolder(userSettings.destinationFolderPath, folder);
    };

    const copyGyazoLink = url => {
        window.api.copyText(url);
        toast.success("Gyazo link copied to clipboard");
    };

    const toggleFavourite = async (folder, filename) => {
        try {
            const favourite = await window.api.toggleFavourite(userSettings.destinationFolderPath, folder, filename);
            updateCroppedFolders(previous => {
                const images = previous[folder].images.map(image => image?.name === filename ? { ...image, favourite } : image);
                return { ...previous, [folder]: { ...previous[folder], images, favouriteCount: images.filter(image => image?.favourite).length } };
            });
            setSelectedCroppedImages({});
        } catch (error) {
            const id = beginActivity(`Updating ${filename}`, undefined, "session", () => toggleFavourite(folder, filename));
            finishActivity(id, "failed", error.message);
            toast.error(`Could not update ${filename}: ${error.message}`);
        }
    };

    const setImageTags = async (folder, filename, tags) => {
        try {
            const savedTags = await window.api.setImageTags(userSettings.destinationFolderPath, folder, filename, tags);
            updateCroppedFolders(previous => ({ ...previous, [folder]: { ...previous[folder], images: previous[folder].images.map(image => image?.name === filename ? { ...image, tags: savedTags } : image) } }));
            return savedTags;
        } catch (error) {
            const id = beginActivity(`Tagging ${filename}`, undefined, "session", () => setImageTags(folder, filename, tags));
            finishActivity(id, "failed", error.message);
            toast.error(`Could not tag ${filename}: ${error.message}`);
            return null;
        }
    };

    const deleteCroppedImages = async images => {
        const activityId = beginActivity(`Deleting ${images.length} image${images.length === 1 ? "" : "s"}`, undefined, "session", () => deleteCroppedImages(images));
        let result;
        try { result = await window.api.deleteCroppedImages(userSettings.destinationFolderPath, images); }
        catch (error) { finishActivity(activityId, "failed", error.message); toast.error(`Delete failed: ${error.message}`); return; }
        finishActivity(activityId, result.failed.length ? "failed" : "complete", result.failed.length ? result.failed[0].error : `${result.deleted.length} moved to the Recycle Bin`);
        if (result.failed.length) {
            const failed = result.failed.map(item => ({ folder: item.folder, name: item.filename }));
            activity.setRetry(activityId, () => deleteCroppedImages(failed));
        }
        if (result.deleted.length) toast.success(`${result.deleted.length} image${result.deleted.length === 1 ? "" : "s"} moved to the Recycle Bin`);
        if (result.failed.length) toast.error(`Could not delete ${result.failed[0].filename}: ${result.failed[0].error}`);
        setSelectedCroppedImages({});
        await getCroppedImages();
    };

    const uploadSelectedToGyazo = async () => {
        if (!userSettings.gyazoAccessToken?.trim()) {
            toast.error("Add your Gyazo access token in Settings first");
            setSettingsOpen(true);
            return;
        }
        const images = Object.entries(selectedCroppedImages).flatMap(([folder, selection]) =>
            Object.entries(selection)
                .filter(([, selected]) => selected)
                .map(([id]) => ({ folder, name: croppedFolders[folder]?.images.find(image => getImageSelectionId(image) === id)?.name }))
                .filter(image => image.name)
        );
        if (!images.length) return;

        const activityId = beginActivity(`Uploading ${images.length} image${images.length === 1 ? "" : "s"} to Gyazo`, undefined, "session", uploadSelectedToGyazo);
        setUploadingToGyazo(true);
        try {
            const result = await window.api.uploadToGyazo(userSettings.destinationFolderPath, userSettings.gyazoAccessToken.trim(), images);
            if (result.authError) {
                const stopped = result.notAttempted ? ` ${result.notAttempted} remaining upload${result.notAttempted === 1 ? " was" : "s were"} stopped.` : "";
                finishActivity(activityId, "failed", `${result.authError}${stopped}`);
                toast.error("Gyazo rejected your access token. Create a new token, then save it in Settings.");
            }
            if (result.uploaded.length) {
                if (!result.authError) finishActivity(activityId, result.failed.length ? "failed" : "complete", `${result.uploaded.length} uploaded${result.failed.length ? `, ${result.failed.length} failed` : ""}`);
                toast.success(`${result.uploaded.length} image${result.uploaded.length === 1 ? "" : "s"} uploaded; link${result.uploaded.length === 1 ? "" : "s"} copied`);
                const uploadedUrls = new Map(result.uploaded.map(image => [`${image.folder}:${image.filename}`, image.url]));
                updateCroppedFolders(previous => Object.fromEntries(Object.entries(previous).map(([folder, data]) => [folder, {
                    ...data,
                    images: data.images.map(image => image ? { ...image, gyazoUrl: uploadedUrls.get(`${folder}:${image.name}`) || image.gyazoUrl } : image),
                    uploadedCount: data.images.reduce((count, image) => count + (image && (uploadedUrls.has(`${folder}:${image.name}`) || image.gyazoUrl) ? 1 : 0), 0),
                }])));
                if (!result.failed.length) setSelectedCroppedImages({});
            }
            if (result.skipped) toast.info(`${result.skipped} already-uploaded image${result.skipped === 1 ? " was" : "s were"} skipped`);
            if (result.failed.length && !result.authError) { finishActivity(activityId, "failed", `${result.failed[0].error}. Failed images remain selected so you can retry.`); toast.error(`Could not upload ${result.failed[0].filename}: ${result.failed[0].error}`); }
        } catch (error) {
            finishActivity(activityId, "failed", error?.message || "Gyazo upload failed");
            toast.error(error?.message || "Gyazo upload failed");
        } finally {
            setUploadingToGyazo(false);
        }
    };
    const cancelUpload = async () => { if (await window.api.cancelUpload()) toast.info("Cancelling remaining uploads"); };
    const retryActivity = item => {
        activity.setOpen(false);
        if (activity.runRetry(item)) return;
        if (item.retry === "upload-selected") uploadSelectedToGyazo();
        if (item.retry === "crop-selected") cropScreenshots(false);
        if (item.retry === "crop-all") cropScreenshots(true);
    };

    return <main className="relative flex h-full min-h-0 flex-col bg-[#090a0c] text-white">
        <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 px-4">
            <span />
            <nav className="flex rounded-lg bg-[#202227] p-1" aria-label="Main views">
                {[["crop", "Crop"], ["view", "View"]].map(([value, label]) => <button key={value} onClick={() => changeTab(value)} className={`h-7 rounded-md px-3 text-xs font-medium transition ${activeTab === value ? "bg-[#34373d] text-white shadow-sm" : "text-white/55 hover:text-white"}`}>{label}</button>)}
            </nav>
            <div className="ml-auto flex gap-2"><button aria-label="Open activity" title="Open activity" onClick={() => activity.setOpen(true)} className="relative grid size-9 place-items-center rounded-lg bg-[#202227] text-white/80 transition hover:bg-[#292c32] hover:text-white"><ListTodo size={16} />{activity.activities.some(item => item.status === "running" || item.status === "failed") && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-400" />}</button><button aria-label="Open settings" title="Open settings" onClick={() => setSettingsOpen(true)} className="grid size-9 place-items-center rounded-lg bg-[#202227] text-white/80 transition hover:bg-[#292c32] hover:text-white"><Settings size={17} /></button></div>
        </header>

        {activeTab === "crop" && <Crop screenshots={screenshots} selectedImages={selectedScreenshots} setSelectedImages={setSelectedScreenshots} refreshImages={refreshScreenshots} refreshing={refreshingScreenshots} refreshLibrary={refreshCroppedImages} importImages={importImages} cropScreenshots={cropScreenshots} cropping={cropping} undoLastCrop={undoLastCrop} undoing={undoingCrop} restoredImages={restoredSourceImages} onBatchRestored={result => setRestoredSourceImages(previous => Object.fromEntries([...Object.entries(previous), ...(result.restoredImages || []).map(image => [image.name, true])]))} copyImage={copySourceImage} loadFullImage={loadSourceImage} cropInsets={userSettings.cropInsets} cropPresets={userSettings.cropPresets} galleryColumns={galleryColumns} setGalleryColumns={setGalleryColumns} />}
        {activeTab === "view" && <View croppedFolders={croppedFolders} loadFolderImages={loadFolderImages} openedFolders={openedFolders} setOpenedFolders={setOpenedFolders} selectedImages={selectedCroppedImages} setSelectedImages={setSelectedCroppedImages} refreshImages={refreshCroppedImages} refreshing={refreshingLibrary} copyImage={copyCroppedImage} copyGyazoLink={copyGyazoLink} toggleFavourite={toggleFavourite} setImageTags={setImageTags} deleteImages={deleteCroppedImages} loadFullImage={loadCroppedImage} openFolder={openCroppedFolder} uploadSelected={uploadSelectedToGyazo} cancelUpload={cancelUpload} uploading={uploadingToGyazo} newFolders={newCroppedImages} clearNewFolder={folder => setNewCroppedImages(previous => { const next = { ...previous }; delete next[folder]; return next; })} galleryColumns={galleryColumns} setGalleryColumns={setGalleryColumns} filter={viewFilter} setFilter={setViewFilter} />}
        {activeTab === "crop-area" && <CropArea screenshots={screenshots} loadFullImage={loadSourceImage} />}

        <div className={`absolute inset-0 z-50 flex justify-end transition-all duration-200 ${settingsOpen ? "pointer-events-auto bg-black/55 opacity-100" : "pointer-events-none bg-transparent opacity-0"}`} onMouseDown={() => setSettingsOpen(false)} aria-hidden={!settingsOpen}>
            <aside className={`flex h-full w-[280px] flex-col border-l border-white/10 bg-[#141518] shadow-2xl transition-transform duration-200 ease-out ${settingsOpen ? "translate-x-0" : "translate-x-full"}`} onMouseDown={event => event.stopPropagation()}>
                <header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-semibold">Settings</h2><p className="mt-0.5 text-[11px] text-white/40">Folders and output preferences</p></div><button aria-label="Close settings" title="Close settings" onClick={() => setSettingsOpen(false)} className="grid size-8 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white"><X size={16} /></button></header>
                <SettingsForm formID="settings-form" compactFolderControls onOpenCropArea={() => { setSettingsOpen(false); setActiveTab("crop-area"); }} className="flex-1 overflow-auto p-4" />
                <footer className="border-t border-white/10 p-3">
                    <div className="flex gap-2"><button type="button" onClick={() => setSettingsOpen(false)} className="h-8 flex-1 rounded-md border border-white/10 bg-[#202227] text-xs font-semibold hover:bg-[#292c32]">Close</button><button type="submit" form="settings-form" className="h-8 flex-1 rounded-md bg-emerald-600 text-xs font-semibold hover:bg-emerald-500">Save settings</button></div>
                    {appVersion && <p className="mt-2 text-center text-[9px] text-white/30">RPUK Screenshot Cropper · Version {appVersion}</p>}
                </footer>
            </aside>
        </div>
        {walkthroughStep !== null && <div className="absolute inset-0 z-[60] grid place-items-center bg-black/75 backdrop-blur-sm"><div className="w-[390px] rounded-xl border border-white/10 bg-[#17191d] p-6 shadow-2xl"><span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Getting started · {walkthroughStep + 1} of 3</span><h2 className="mt-3 text-lg font-semibold">{["Choose your folders", "Set crop areas by resolution", "Review, organise and share"][walkthroughStep]}</h2><p className="mt-2 text-xs leading-5 text-white/50">{["Open Settings to choose the watched screenshot folder and cropped-image destination. Both are monitored automatically.", "Use Edit crop area in Settings. Drag each edge, zoom for precision, and save a different preset for every resolution.", "Use View to favourite, filter, upload, copy links, or safely move selected files to the Recycle Bin."][walkthroughStep]}</p><div className="mt-6 flex justify-between"><button onClick={() => { window.api.setPreference("walkthroughComplete", true); setWalkthroughStep(null); }} className="h-8 px-2 text-xs text-white/40 hover:text-white">Skip</button><button onClick={() => { if (walkthroughStep === 2) { window.api.setPreference("walkthroughComplete", true); setWalkthroughStep(null); } else setWalkthroughStep(step => step + 1); }} className="h-8 rounded-md bg-emerald-600 px-4 text-xs font-semibold hover:bg-emerald-500">{walkthroughStep === 2 ? "Get started" : "Next"}</button></div></div></div>}
        <ActivityCenter open={activity.open} onClose={() => activity.setOpen(false)} activities={activity.activities} onClear={activity.clearFinished} onRetry={retryActivity} />
    </main>;
};

export default MainScreen;
