import { extname } from 'node:path'

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

// These are image formats a screenshot tool may genuinely produce, but which
// this app cannot currently decode or crop. Ordinary sidecar files such as
// desktop.ini, Thumbs.db, JSON and text files should be ignored silently.
export const UNSUPPORTED_IMAGE_EXTENSIONS = new Set([
    '.avif',
    '.bmp',
    '.gif',
    '.heic',
    '.heif',
    '.jfif',
    '.svg',
    '.tif',
    '.tiff'
])

export const isSupportedImage = (filename) =>
    SUPPORTED_IMAGE_EXTENSIONS.has(extname(filename).toLowerCase())

export const isUnsupportedImage = (filename) =>
    UNSUPPORTED_IMAGE_EXTENSIONS.has(extname(filename).toLowerCase())
