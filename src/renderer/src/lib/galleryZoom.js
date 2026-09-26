export const MIN_GALLERY_COLUMNS = 1;
export const MAX_GALLERY_COLUMNS = 7;
export const DEFAULT_GALLERY_COLUMNS = 4;

export function clampGalleryColumns(value) {
    return Math.min(MAX_GALLERY_COLUMNS, Math.max(MIN_GALLERY_COLUMNS, Math.round(Number(value) || DEFAULT_GALLERY_COLUMNS)));
}
