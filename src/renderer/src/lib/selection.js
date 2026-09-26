export function countSelectedImages(selectedImages) {
    return Object.values(selectedImages).reduce((total, folder) => total + Object.values(folder).filter(Boolean).length, 0);
}

export function createFolderSelection(imageCount, currentSelection = {}) {
    const allSelected = imageCount > 0 && Array.from({ length: imageCount }, (_, index) => currentSelection[index]).every(Boolean);
    return Object.fromEntries(Array.from({ length: imageCount }, (_, index) => [index, !allSelected]));
}

export const getImageSelectionId = image => {
    const contentIdentity = image?.id || image?.fingerprint;
    if (!contentIdentity) return image?.name;
    return image?.name ? `${contentIdentity}:${image.name}` : contentIdentity;
};

export function remapIndexSelection(previousImages = [], nextImages = [], previousSelection = {}) {
    const selectedIdentities = new Set(
        Object.entries(previousSelection)
            .filter(([, selected]) => selected)
            .map(([index]) => getImageSelectionId(previousImages[Number(index)]))
            .filter(Boolean),
    );

    return Object.fromEntries(
        nextImages
            .map((image, index) => [index, selectedIdentities.has(getImageSelectionId(image))])
            .filter(([, selected]) => selected),
    );
}

export function pruneStableSelection(previousSelection = {}, images = []) {
    const availableIdentities = new Set(images.map(getImageSelectionId).filter(Boolean));
    return Object.fromEntries(
        Object.entries(previousSelection).filter(([identity, selected]) => selected && availableIdentities.has(identity)),
    );
}
