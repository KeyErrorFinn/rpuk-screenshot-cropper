import { useEffect, useState } from "react";
import { DEFAULT_GALLERY_COLUMNS } from "@renderer/lib/galleryZoom";

export function useWorkspacePreferences() {
    const [activeTab, setActiveTab] = useState("crop");
    const [galleryColumns, setGalleryColumns] = useState(DEFAULT_GALLERY_COLUMNS);
    const [viewFilter, setViewFilter] = useState("all");
    const [openedFolders, setOpenedFolders] = useState([]);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        window.api.getPreference("workspacePreferences").then(preferences => {
            if (preferences?.activeTab === "crop" || preferences?.activeTab === "view") setActiveTab(preferences.activeTab);
            if (Number.isInteger(preferences?.galleryColumns) && preferences.galleryColumns >= 1 && preferences.galleryColumns <= 7) setGalleryColumns(preferences.galleryColumns);
            if (["all", "new", "favourite", "uploaded", "not-uploaded"].includes(preferences?.viewFilter)) setViewFilter(preferences.viewFilter);
            if (Array.isArray(preferences?.openedFolders)) setOpenedFolders(preferences.openedFolders.filter(value => typeof value === "string").slice(0, 50));
        }).finally(() => setLoaded(true));
    }, []);
    useEffect(() => {
        if (!loaded) return;
        const timer = setTimeout(() => window.api.setPreference("workspacePreferences", { activeTab: activeTab === "crop-area" ? "crop" : activeTab, galleryColumns, viewFilter, openedFolders }), 150);
        return () => clearTimeout(timer);
    }, [activeTab, galleryColumns, openedFolders, viewFilter, loaded]);
    return { activeTab, setActiveTab, galleryColumns, setGalleryColumns, viewFilter, setViewFilter, openedFolders, setOpenedFolders };
}
