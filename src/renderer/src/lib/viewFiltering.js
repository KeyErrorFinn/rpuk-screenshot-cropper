export function imageMatchesViewFilter(image, { filter = "all", query = "", isNew = false } = {}) {
    if (!image) return false;
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery && !`${image.name}\n${(image.tags || []).join("\n")}`.toLowerCase().includes(normalizedQuery)) return false;
    if (filter === "new") return isNew;
    if (filter === "uploaded") return Boolean(image.gyazoUrl);
    if (filter === "not-uploaded") return !image.gyazoUrl;
    if (filter === "favourite") return Boolean(image.favourite);
    return true;
}

export function folderMatchesViewFilter(folder, data, { filter = "all", query = "", newFolders = {} } = {}) {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery && !`${folder}\n${data.searchText || ""}`.includes(normalizedQuery)) return false;
    if (filter === "new") return Object.keys(newFolders[folder] || {}).length > 0;
    if (filter === "uploaded") return data.uploadedCount > 0;
    if (filter === "not-uploaded") return data.imageCount - data.uploadedCount > 0;
    if (filter === "favourite") return data.loaded ? data.images.some(image => image?.favourite) : data.favouriteCount > 0;
    return true;
}
