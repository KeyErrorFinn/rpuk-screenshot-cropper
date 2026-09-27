export const DEFAULT_CROP_INSETS = Object.freeze({ top: 36, right: 0, bottom: 53, left: 0 })

export const CROP_PRESETS = Object.freeze([
    { label: '720p', resolution: '1280×720', insets: { top: 24, right: 0, bottom: 35, left: 0 } },
    { label: '1080p', resolution: '1920×1080', insets: { ...DEFAULT_CROP_INSETS } },
    { label: '1440p', resolution: '2560×1440', insets: { top: 48, right: 0, bottom: 71, left: 0 } },
    { label: '4K', resolution: '3840×2160', insets: { top: 72, right: 0, bottom: 106, left: 0 } }
])

const pixelValue = (value) => Math.max(0, Math.round(Number(value) || 0))

export function normalizeCropInsets(insets = DEFAULT_CROP_INSETS) {
    return {
        top: pixelValue(insets.top),
        right: pixelValue(insets.right),
        bottom: pixelValue(insets.bottom),
        left: pixelValue(insets.left)
    }
}

export function getCropRegion(width, height, insets) {
    const normalized = normalizeCropInsets(insets)
    if (
        !width ||
        !height ||
        normalized.left + normalized.right >= width ||
        normalized.top + normalized.bottom >= height
    ) {
        throw new Error('Crop margins must leave part of the image visible')
    }
    return {
        left: normalized.left,
        top: normalized.top,
        width: width - normalized.left - normalized.right,
        height: height - normalized.top - normalized.bottom
    }
}

export function scaleCropInsets(insets, width, height) {
    const normalized = normalizeCropInsets(insets)
    const referenceWidth = Number(insets?.referenceWidth) || width
    const referenceHeight = Number(insets?.referenceHeight) || height
    return normalizeCropInsets({
        top: (normalized.top * height) / referenceHeight,
        right: (normalized.right * width) / referenceWidth,
        bottom: (normalized.bottom * height) / referenceHeight,
        left: (normalized.left * width) / referenceWidth
    })
}

export function getCropInsetsForResolution(configuration = {}, width, height) {
    const legacyInsets = configuration?.top !== undefined ? configuration : configuration.cropInsets
    const exactPreset = configuration.cropPresets?.[`${width}x${height}`]
    return scaleCropInsets(exactPreset || legacyInsets || DEFAULT_CROP_INSETS, width, height)
}
