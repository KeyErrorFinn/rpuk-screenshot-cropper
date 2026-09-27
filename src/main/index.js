import {
    app,
    shell,
    BrowserWindow,
    ipcMain,
    dialog,
    clipboard,
    Menu,
    nativeImage,
    safeStorage,
    screen,
    Tray
} from 'electron'
import { constants as fsConstants, mkdirSync, promises as fs, watch as watchFileSystem } from 'fs'
import { basename, join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import sharp from 'sharp'
import Store from 'electron-store'
import icon from '../../resources/icon.png?asset'
import { registerImageActionHandlers } from './imageActions.js'
import { calculateWindowBounds } from './windowBounds.js'
import {
    createTaskLimiter,
    getOrCreateThumbnailDeduplicated,
    getThumbnailCacheKey,
    IMAGE_LOAD_CONCURRENCY,
    mapWithConcurrency
} from './imagePipeline.js'
import { uploadSelectedToGyazo } from './gyazoUpload.js'
import { getCropInsetsForResolution, getCropRegion } from '../shared/cropSettings.js'
import { isSupportedImage } from './imageFileSupport.js'
import {
    configuredCroppedPath,
    configuredSourcePath,
    requireChildName,
    requireCompatibleFolderRoots,
    requireConfiguredRoot,
    validateIpcSender
} from './pathSecurity.js'
import { IPC_CHANNELS, ipcSchemas, parseIpcArguments } from '../shared/ipcContracts.js'
import { chooseAvailablePath, createCropTransactionService } from './cropTransaction.js'
import { createImageIndex } from './imageIndex.js'
import { createLogger, redactDetails } from './logger.js'
import { createDirectoryCatalog } from './directoryCatalog.js'
import { findMovedFolder, getFolderIdentity } from './folderRecovery.js'
import { createFolderMonitor } from './folderMonitor.js'

const chromiumCachePath = join(app.getPath('userData'), 'ChromiumCache-v2')
mkdirSync(chromiumCachePath, { recursive: true })
app.setPath('cache', chromiumCachePath)
app.commandLine.appendSwitch('disk-cache-dir', chromiumCachePath)

const store = new Store()
const reportedImageWarnings = new Set()
const scheduleImageTask = createTaskLimiter(IMAGE_LOAD_CONCURRENCY)
const imageIndex = createImageIndex({ fileSystem: fs, store })
const directoryCatalog = createDirectoryCatalog({ fileSystem: fs })
const logger = createLogger({ directory: join(app.getPath('userData'), 'logs'), fileSystem: fs })
let tray
let monitoringPaused = store.get('monitoringPaused', false)
let folderMonitor
let activeUploadController

const cleanThumbnailCache = async () => {
    const cacheDirectory = join(app.getPath('userData'), 'thumbnail-cache')
    await fs.mkdir(cacheDirectory, { recursive: true })
    const files = await fs.readdir(cacheDirectory, { withFileTypes: true })
    const records = await Promise.all(
        files
            .filter((file) => file.isFile())
            .map(async (file) => ({
                path: join(cacheDirectory, file.name),
                stats: await fs.stat(join(cacheDirectory, file.name))
            }))
    )
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const stale = records.filter((record) => record.stats.mtimeMs < cutoff)
    const excess = records.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs).slice(2000)
    await Promise.all(
        [...new Map([...stale, ...excess].map((record) => [record.path, record])).values()].map(
            (record) => fs.rm(record.path, { force: true })
        )
    )
}

let cropTransactionService
const recoverInterruptedCropBatches = async () => {
    const result = await cropTransactionService.recover()
    if (result.recovered.length)
        store.set(
            'cropRecoveryNotice',
            result.errors.length ? { errors: result.errors } : { recovered: true }
        )
}

const getStoredGyazoUrl = (record, filename) => {
    if (!record) return null
    if (record.imageUrl) return record.imageUrl
    if (!record.imageId) return null
    const extension = extname(filename).toLowerCase() || '.png'
    return `https://i.gyazo.com/${record.imageId}${extension}`
}

const getImageThumbnail = async (filePath) => {
    return scheduleImageTask(async () => {
        const stats = await fs.stat(filePath)
        const thumbnail = await getOrCreateThumbnailDeduplicated(filePath, stats, {
            cacheDirectory: join(app.getPath('userData'), 'thumbnail-cache'),
            fileSystem: fs,
            sharpFactory: sharp
        })
        return {
            thumbnail,
            modified: stats.mtime,
            fingerprint: getThumbnailCacheKey(filePath, stats)
        }
    })
}

const getImageMetadata = (filePath) =>
    scheduleImageTask(async () => {
        const indexed = await imageIndex.metadata(filePath, () => sharp(filePath).metadata())
        return {
            ...indexed,
            fingerprint: indexed.id,
            legacyFingerprint: getThumbnailCacheKey(filePath, {
                size: indexed.size,
                mtimeMs: indexed.mtimeMs
            })
        }
    })

cropTransactionService = createCropTransactionService({
    fileSystem: fs,
    sharpFactory: sharp,
    store,
    userDataPath: app.getPath('userData'),
    trashItem: (path) => shell.trashItem(path),
    getCropInsets: getCropInsetsForResolution,
    getCropRegion,
    mapConcurrent: mapWithConcurrency
})

const currentSettings = () => store.get('settings', {})
const getPublicSettings = () => {
    const value = store.get('settings')
    if (!value?.gyazoAccessTokenEncrypted) return value
    const settings = { ...value }
    delete settings.gyazoAccessTokenEncrypted
    try {
        return {
            ...settings,
            gyazoAccessToken: safeStorage.decryptString(
                Buffer.from(value.gyazoAccessTokenEncrypted, 'base64')
            )
        }
    } catch {
        return { ...settings, gyazoAccessToken: '' }
    }
}
const rememberFolderIdentities = async (settings) => {
    const identities = {}
    for (const [key, path] of [
        ['screenshotFolderPath', settings.screenshotFolderPath],
        ['destinationFolderPath', settings.destinationFolderPath]
    ]) {
        if (path) identities[key] = await getFolderIdentity(fs, path).catch(() => null)
    }
    store.set('folderIdentities', identities)
}
const recoverConfiguredFolders = async () => {
    const settings = currentSettings()
    const identities = store.get('folderIdentities', {})
    const recovered = {}
    for (const key of ['screenshotFolderPath', 'destinationFolderPath']) {
        const path = settings[key]
        if (!path || !identities[key]) continue
        const available = await fs
            .access(path)
            .then(() => true)
            .catch(() => false)
        if (available) continue
        const replacement = await findMovedFolder(fs, path, identities[key])
        if (replacement) {
            settings[key] = replacement
            recovered[key] = replacement
        }
    }
    if (Object.keys(recovered).length) {
        store.set('settings', settings)
        directoryCatalog.clear()
        imageIndex.invalidate()
        logger.info('folders.recovered', recovered)
    }
    return recovered
}
registerImageActionHandlers({
    ipcMain,
    shell,
    clipboard,
    nativeImage,
    resolveSource: (root, filename) => configuredSourcePath(currentSettings(), root, filename),
    resolveCropped: (root, folder, filename) =>
        configuredCroppedPath(currentSettings(), root, folder, filename),
    validateSender: (event) =>
        validateIpcSender(event, { rendererUrl: process.env.ELECTRON_RENDERER_URL })
})

function createWindow() {
    const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const windowBounds = calculateWindowBounds(activeDisplay)

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        ...windowBounds,
        show: false,
        autoHideMenuBar: true,
        frame: false,
        titleBarStyle: 'hidden',
        icon,
        webPreferences: {
            preload: join(__dirname, '../preload/index.cjs'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
            // webSecurity: false,
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    const assertRequest = (event) =>
        validateIpcSender(event, { rendererUrl: process.env.ELECTRON_RENDERER_URL })

    const sendImageWarningOnce = (key, warning) => {
        if (reportedImageWarnings.has(key)) return
        reportedImageWarnings.add(key)
        mainWindow.webContents.send(IPC_CHANNELS.imageWarning, warning)
    }

    folderMonitor = createFolderMonitor({
        watch: watchFileSystem,
        getSettings: currentSettings,
        send: (channel, payload) => {
            if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload)
        },
        invalidate: (changedPath) => {
            if (changedPath) {
                directoryCatalog.invalidate(changedPath)
                imageIndex.invalidate(changedPath)
            } else {
                directoryCatalog.clear()
                imageIndex.invalidate()
            }
        },
        recover: async () => {
            const recovered = await recoverConfiguredFolders()
            if (!Object.keys(recovered).length) return false
            await rememberFolderIdentities(currentSettings())
            mainWindow.webContents.send(IPC_CHANNELS.settingsChanged, getPublicSettings())
            return true
        },
        logger,
        paused: monitoringPaused
    })
    mainWindow.webContents.once('did-finish-load', () => folderMonitor.start())
    mainWindow.once('closed', () => folderMonitor.stop())

    // WINDOW LOGIC
    ipcMain.on(IPC_CHANNELS.windowMinimize, (event) => {
        assertRequest(event)
        mainWindow.hide()
    })
    ipcMain.on(IPC_CHANNELS.windowMaximize, (event) => {
        assertRequest(event)
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    })
    ipcMain.on(IPC_CHANNELS.windowClose, (event) => {
        assertRequest(event)
        mainWindow.close()
    })
    ipcMain.on(IPC_CHANNELS.windowFullscreen, (event, enabled) => {
        assertRequest(event)
        ;[enabled] = parseIpcArguments(ipcSchemas.boolean, [enabled])
        mainWindow.setFullScreen(enabled)
    })
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send(IPC_CHANNELS.windowMaximized)
    })
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send(IPC_CHANNELS.windowRestored)
    })

    // Folder Selection
    ipcMain.handle(IPC_CHANNELS.selectFolder, async (event) => {
        assertRequest(event)
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })
        return result.filePaths[0]
    })

    // Storage
    ipcMain.handle(IPC_CHANNELS.getAppVersion, (event) => {
        assertRequest(event)
        parseIpcArguments(ipcSchemas.noArguments, [])
        return app.getVersion()
    })
    ipcMain.handle(IPC_CHANNELS.getSettings, (event) => {
        assertRequest(event)
        return getPublicSettings()
    })
    ipcMain.handle(IPC_CHANNELS.getFolderHealth, async (event) => {
        assertRequest(event)
        const recovered = await recoverConfiguredFolders()
        if (Object.keys(recovered).length) {
            await rememberFolderIdentities(currentSettings())
            folderMonitor.start()
        }
        const settings = currentSettings()
        const inspect = async (path) => {
            if (!path) return { status: 'not-configured' }
            try {
                await fs.access(path, fsConstants.R_OK | fsConstants.W_OK)
                return { status: 'available', path }
            } catch (error) {
                return {
                    status:
                        error.code === 'ENOENT'
                            ? 'missing'
                            : error.code === 'EACCES' || error.code === 'EPERM'
                              ? 'read-only'
                              : 'unavailable',
                    path,
                    detail: error.message
                }
            }
        }
        return {
            source: await inspect(settings.screenshotFolderPath),
            destination: await inspect(settings.destinationFolderPath),
            monitoringPaused: folderMonitor?.paused ?? monitoringPaused,
            recovered
        }
    })
    ipcMain.handle(IPC_CHANNELS.exportDiagnostics, async (event) => {
        assertRequest(event)
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export diagnostic report',
            defaultPath: `rpuk-cropper-diagnostics-${new Date().toISOString().slice(0, 10)}.json`,
            filters: [{ name: 'JSON report', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePath) return false
        const settings = currentSettings()
        const report = redactDetails({
            generatedAt: new Date().toISOString(),
            app: {
                version: app.getVersion(),
                electron: process.versions.electron,
                chrome: process.versions.chrome,
                node: process.versions.node,
                platform: process.platform
            },
            settings: {
                screenshotFolderConfigured: Boolean(settings.screenshotFolderPath),
                destinationFolderConfigured: Boolean(settings.destinationFolderPath),
                keepOriginalImage: settings.keepOriginalImage
            },
            monitoringPaused: folderMonitor?.paused ?? monitoringPaused,
            cropBatches: cropTransactionService.getHistory(),
            uploadQueue: store.get('gyazoUploadQueue', []),
            recentLogs: await logger.readRecent()
        })
        await fs.writeFile(result.filePath, JSON.stringify(report, null, 2), 'utf8')
        logger.info('diagnostics.exported')
        return true
    })
    ipcMain.handle(IPC_CHANNELS.setSettings, async (event, value) => {
        assertRequest(event)
        ;[value] = parseIpcArguments(ipcSchemas.settings, [value])
        const { source, destination } = requireCompatibleFolderRoots(
            value.screenshotFolderPath,
            value.destinationFolderPath
        )
        await Promise.all([
            fs.access(source, fsConstants.R_OK | fsConstants.W_OK),
            fs.access(destination, fsConstants.R_OK | fsConstants.W_OK)
        ])
        if (value?.gyazoAccessToken && safeStorage.isEncryptionAvailable()) {
            const { gyazoAccessToken, ...settings } = value
            store.set('settings', {
                ...settings,
                gyazoAccessTokenEncrypted: safeStorage
                    .encryptString(gyazoAccessToken)
                    .toString('base64')
            })
        } else {
            store.set('settings', value)
        }
        await rememberFolderIdentities(currentSettings())
        folderMonitor.start()
        return true
    })

    ipcMain.handle(IPC_CHANNELS.getPreference, (event, key) => {
        assertRequest(event)
        ;[key] = parseIpcArguments(ipcSchemas.preferenceGet, [key])
        return store.get(key)
    })
    ipcMain.handle(IPC_CHANNELS.setPreference, (event, key, value) => {
        assertRequest(event)
        ;[key, value] = parseIpcArguments(ipcSchemas.preferenceSet, [key, value])
        store.set(key, value)
        return true
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Get Screenshots
    ipcMain.handle(IPC_CHANNELS.getScreenshots, async (event, inputPath) => {
        assertRequest(event)
        ;[inputPath] = parseIpcArguments(ipcSchemas.sourceRoot, [inputPath])
        inputPath = requireConfiguredRoot(
            inputPath,
            currentSettings().screenshotFolderPath,
            'Screenshot'
        )

        const files = await directoryCatalog.list(inputPath)
        const imageFiles = files.filter((entry) => entry.isFile() && isSupportedImage(entry.name))
        const images = await mapWithConcurrency(
            imageFiles,
            IMAGE_LOAD_CONCURRENCY,
            async (entry) => {
                try {
                    const { modified, fingerprint, width, height } = await getImageMetadata(
                        join(inputPath, entry.name)
                    )
                    return { name: entry.name, modified, fingerprint, width, height }
                } catch (error) {
                    sendImageWarningOnce(`corrupt:${inputPath}:${entry.name}`, {
                        message: `Could not load ${entry.name}`,
                        detail: error.message
                    })
                    return null
                }
            }
        )

        const validImages = images.filter(Boolean)
        validImages.sort((a, b) => b.modified - a.modified)

        return validImages
    })

    ipcMain.handle(IPC_CHANNELS.getSourceThumbnail, async (event, inputPath, filename) => {
        assertRequest(event)
        ;[inputPath, filename] = parseIpcArguments(ipcSchemas.sourceFile, [inputPath, filename])
        return (
            await getImageThumbnail(configuredSourcePath(currentSettings(), inputPath, filename))
        ).thumbnail
    })

    ipcMain.handle(IPC_CHANNELS.importFiles, async (event, filePaths) => {
        assertRequest(event)
        ;[filePaths] = parseIpcArguments(ipcSchemas.importFiles, [filePaths])
        const sourceRoot = requireConfiguredRoot(
            currentSettings().screenshotFolderPath,
            currentSettings().screenshotFolderPath,
            'Screenshot'
        )
        const imported = []
        const failed = []
        const reserved = new Set()
        for (const filePath of filePaths) {
            const filename = basename(filePath)
            if (!isSupportedImage(filename)) {
                failed.push({ filename, error: 'Unsupported image format' })
                continue
            }
            try {
                const destination = await chooseAvailablePath(
                    fs,
                    join(sourceRoot, filename),
                    reserved
                )
                await fs.copyFile(filePath, destination)
                await sharp(destination).metadata()
                imported.push({ name: basename(destination) })
                directoryCatalog.invalidate(sourceRoot)
            } catch (error) {
                failed.push({ filename, error: error.message })
            }
        }
        return { imported, failed }
    })

    ipcMain.handle(IPC_CHANNELS.importClipboard, async (event) => {
        assertRequest(event)
        const image = clipboard.readImage()
        if (image.isEmpty())
            return {
                imported: [],
                failed: [{ filename: 'Clipboard', error: 'Clipboard does not contain an image' }]
            }
        const sourceRoot = requireConfiguredRoot(
            currentSettings().screenshotFolderPath,
            currentSettings().screenshotFolderPath,
            'Screenshot'
        )
        const desired = join(
            sourceRoot,
            `clipboard-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
        )
        const destination = await chooseAvailablePath(fs, desired)
        await fs.writeFile(destination, image.toPNG())
        directoryCatalog.invalidate(sourceRoot)
        return { imported: [{ name: basename(destination) }], failed: [] }
    })

    // Get Cropped Images
    ipcMain.handle(IPC_CHANNELS.getCroppedFolders, async (event, outputPath) => {
        assertRequest(event)
        ;[outputPath] = parseIpcArguments(ipcSchemas.croppedRoot, [outputPath])
        outputPath = requireConfiguredRoot(
            outputPath,
            currentSettings().destinationFolderPath,
            'Destination'
        )

        const croppedOutputPath = join(outputPath, 'cropped')
        const entries = await directoryCatalog.list(croppedOutputPath).catch((error) => {
            if (error?.code === 'ENOENT') return []
            throw error
        })

        // Parse folder names as dates and sort them newest → oldest
        const dateFolders = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => {
                const [da, ma, ya] = a.split('-').map(Number)
                const [db, mb, yb] = b.split('-').map(Number)

                const dateA = new Date(2000 + ya, ma - 1, da)
                const dateB = new Date(2000 + yb, mb - 1, db)

                return dateB - dateA // newest first
            })

        const uploadHistory = store.get('gyazoUploads', {})
        const favourites = store.get('favouriteImages', {})
        const imageTags = store.get('imageTags', {})
        const uploadLocations = new Set(
            Object.values(uploadHistory)
                .filter((value) => value?.folder && value?.filename)
                .map((value) => `${value.folder}\0${value.filename}`)
        )
        const favouriteLocations = new Set(
            Object.values(favourites)
                .filter((value) => value?.folder && value?.filename)
                .map((value) => `${value.folder}\0${value.filename}`)
        )
        const dateFoldersInfo = await mapWithConcurrency(dateFolders, 16, async (folder) => {
            const folderPath = join(croppedOutputPath, folder)
            const entries = await directoryCatalog.list(folderPath)
            const files = entries.filter((file) => file.isFile() && isSupportedImage(file.name))
            const fileRecords = files.map((file) => {
                const filePath = join(folderPath, file.name)
                const metadata = imageIndex.peek(filePath)
                const legacyFingerprint =
                    metadata &&
                    getThumbnailCacheKey(filePath, {
                        size: metadata.size,
                        mtimeMs: metadata.mtimeMs
                    })
                return {
                    name: file.name,
                    uploaded:
                        uploadLocations.has(`${folder}\0${file.name}`) ||
                        Boolean(
                            metadata &&
                                (uploadHistory[metadata.id] || uploadHistory[legacyFingerprint])
                        ),
                    favourite:
                        favouriteLocations.has(`${folder}\0${file.name}`) ||
                        Boolean(
                            metadata && (favourites[metadata.id] || favourites[legacyFingerprint])
                        ),
                    tags: metadata ? imageTags[metadata.id] || [] : []
                }
            })

            return {
                folderName: folder,
                imageCount: files.length,
                uploadedCount: fileRecords.filter((record) => record.uploaded).length,
                favouriteCount: fileRecords.filter((record) => record.favourite).length,
                searchText: fileRecords
                    .flatMap((record) => [record.name, ...record.tags])
                    .join('\n')
                    .toLowerCase(),
                resolutions: [],
                contentSignature: files
                    .map((file) => file.name)
                    .sort()
                    .join('|')
            }
        })

        return dateFoldersInfo
    })

    ipcMain.handle(IPC_CHANNELS.getFolderImages, async (event, outputPath, folderName) => {
        assertRequest(event)
        ;[outputPath, folderName] = parseIpcArguments(ipcSchemas.croppedFolder, [
            outputPath,
            folderName
        ])
        const folderPath = configuredCroppedPath(currentSettings(), outputPath, folderName)
        const files = await directoryCatalog.list(folderPath)
        const uploadHistory = store.get('gyazoUploads', {})
        const favourites = store.get('favouriteImages', {})
        const imageTags = store.get('imageTags', {})

        const imageFiles = files.filter((entry) => entry.isFile() && isSupportedImage(entry.name))
        const folderImages = await mapWithConcurrency(
            imageFiles,
            IMAGE_LOAD_CONCURRENCY,
            async (entry) => {
                try {
                    const filePath = join(folderPath, entry.name)
                    const { id, modified, fingerprint, legacyFingerprint, width, height } =
                        await getImageMetadata(filePath)
                    const uploaded = uploadHistory[id] || uploadHistory[legacyFingerprint]
                    if (uploaded && !uploadHistory[id]) {
                        uploadHistory[id] = uploaded
                        store.set('gyazoUploads', uploadHistory)
                    }
                    const favourite = Boolean(favourites[id] || favourites[legacyFingerprint])
                    if (favourite && !favourites[id]) {
                        favourites[id] = true
                        store.set('favouriteImages', favourites)
                    }
                    return {
                        name: entry.name,
                        modified,
                        width,
                        height,
                        fingerprint,
                        id,
                        gyazoUrl: getStoredGyazoUrl(uploaded, entry.name),
                        favourite,
                        tags: imageTags[id] || []
                    }
                } catch (error) {
                    sendImageWarningOnce(`corrupt:${folderPath}:${entry.name}`, {
                        message: `Could not load ${entry.name}`,
                        detail: error.message
                    })
                    return null
                }
            }
        )

        const validFolderImages = folderImages.filter(Boolean)
        validFolderImages.sort((a, b) => b.modified - a.modified)

        return validFolderImages
    })

    ipcMain.handle(
        IPC_CHANNELS.getCroppedThumbnail,
        async (event, outputPath, folderName, filename) => {
            assertRequest(event)
            ;[outputPath, folderName, filename] = parseIpcArguments(ipcSchemas.croppedFile, [
                outputPath,
                folderName,
                filename
            ])
            return (
                await getImageThumbnail(
                    configuredCroppedPath(currentSettings(), outputPath, folderName, filename)
                )
            ).thumbnail
        }
    )

    ipcMain.handle(IPC_CHANNELS.getSourceImage, async (event, inputPath, filename) => {
        assertRequest(event)
        ;[inputPath, filename] = parseIpcArguments(ipcSchemas.sourceFile, [inputPath, filename])
        return fs.readFile(configuredSourcePath(currentSettings(), inputPath, filename))
    })

    ipcMain.handle(
        IPC_CHANNELS.getCroppedImage,
        async (event, outputPath, folderName, filename) => {
            assertRequest(event)
            ;[outputPath, folderName, filename] = parseIpcArguments(ipcSchemas.croppedFile, [
                outputPath,
                folderName,
                filename
            ])
            return fs.readFile(
                configuredCroppedPath(currentSettings(), outputPath, folderName, filename)
            )
        }
    )

    ipcMain.handle(
        IPC_CHANNELS.uploadGyazo,
        async (event, outputPath, accessToken, selectedImages) => {
            assertRequest(event)
            ;[outputPath, accessToken, selectedImages] = parseIpcArguments(ipcSchemas.upload, [
                outputPath,
                accessToken,
                selectedImages
            ])
            outputPath = requireConfiguredRoot(
                outputPath,
                currentSettings().destinationFolderPath,
                'Destination'
            )
            const uploadHistory = store.get('gyazoUploads', {})
            const eligibleImages = []
            let skipped = 0
            for (const image of selectedImages || []) {
                const folder = requireChildName(image.folder || '', 'folder name')
                const filename = requireChildName(image.name || '', 'filename')
                if (!folder || !filename) continue
                const filePath = configuredCroppedPath(
                    currentSettings(),
                    outputPath,
                    folder,
                    filename
                )
                try {
                    const metadata = await getImageMetadata(filePath)
                    if (uploadHistory[metadata.id] || uploadHistory[metadata.legacyFingerprint]) {
                        skipped += 1
                        continue
                    }
                } catch {
                    // Let the uploader report missing or unreadable files normally.
                }
                eligibleImages.push({ folder, name: filename })
            }
            let uploadQueue = eligibleImages.map((image) => ({
                id: `${image.folder}:${image.name}`,
                ...image,
                status: 'queued',
                createdAt: new Date().toISOString(),
                attempts: 0
            }))
            store.set('gyazoUploadQueue', uploadQueue)
            mainWindow.setProgressBar(0)
            activeUploadController?.abort()
            activeUploadController = new AbortController()
            let result
            try {
                result = await uploadSelectedToGyazo(outputPath, accessToken, eligibleImages, {
                    fileSystem: fs,
                    fetchFunction: fetch,
                    signal: activeUploadController.signal,
                    onProgress: (value) => {
                        mainWindow.setProgressBar(value)
                        mainWindow.webContents.send(IPC_CHANNELS.operationProgress, {
                            type: 'upload',
                            value
                        })
                    },
                    onItemComplete: async (image) => {
                        uploadQueue = uploadQueue.map((item) =>
                            item.folder === image.folder && item.name === image.filename
                                ? {
                                      ...item,
                                      status: image.ok
                                          ? 'complete'
                                          : image.notAttempted
                                            ? 'blocked'
                                            : 'failed',
                                      error: image.error,
                                      errorCode: image.code,
                                      attempts: item.attempts + (image.notAttempted ? 0 : 1),
                                      completedAt: image.ok ? new Date().toISOString() : undefined
                                  }
                                : item
                        )
                        store.set('gyazoUploadQueue', uploadQueue)
                        if (!image.ok) return
                        const filePath = configuredCroppedPath(
                            currentSettings(),
                            outputPath,
                            image.folder,
                            image.filename
                        )
                        const metadata = await getImageMetadata(filePath)
                        image.url ||= getStoredGyazoUrl({ imageId: image.image_id }, image.filename)
                        uploadHistory[metadata.id] = {
                            imageId: image.image_id,
                            permalinkUrl: image.permalink_url,
                            imageUrl: image.url,
                            folder: image.folder,
                            filename: image.filename,
                            uploadedAt: new Date().toISOString()
                        }
                        store.set('gyazoUploads', uploadHistory)
                    }
                })
            } finally {
                mainWindow.setProgressBar(-1)
                activeUploadController = null
            }
            result.skipped = skipped
            const links = result.uploaded.map((image) => image.url).filter(Boolean)
            if (links.length) clipboard.writeText(links.join('\n'))
            if (!result.failed.length) store.delete('gyazoUploadQueue')
            return result
        }
    )

    ipcMain.handle(IPC_CHANNELS.getPendingUpload, (event) => {
        assertRequest(event)
        const legacy = store.get('pendingGyazoUpload', null)
        if (legacy) {
            store.delete('pendingGyazoUpload')
            return legacy
        }
        const selectedImages = store
            .get('gyazoUploadQueue', [])
            .filter((item) => item.status === 'queued' || item.status === 'uploading')
            .map((item) => ({ folder: item.folder, name: item.name }))
        return selectedImages.length
            ? { outputPath: currentSettings().destinationFolderPath, selectedImages }
            : null
    })
    ipcMain.handle(IPC_CHANNELS.cancelUpload, (event) => {
        assertRequest(event)
        if (!activeUploadController) return false
        activeUploadController.abort()
        return true
    })

    ipcMain.on(IPC_CHANNELS.copyText, (event, text) => {
        assertRequest(event)
        ;[text] = parseIpcArguments(ipcSchemas.text, [text])
        clipboard.writeText(text)
    })

    ipcMain.handle(
        IPC_CHANNELS.toggleFavourite,
        async (event, outputPath, folderName, filename) => {
            assertRequest(event)
            ;[outputPath, folderName, filename] = parseIpcArguments(ipcSchemas.croppedFile, [
                outputPath,
                folderName,
                filename
            ])
            const filePath = configuredCroppedPath(
                currentSettings(),
                outputPath,
                folderName,
                filename
            )
            const { id: fingerprint } = await getImageMetadata(filePath)
            const favourites = store.get('favouriteImages', {})
            if (favourites[fingerprint]) delete favourites[fingerprint]
            else
                favourites[fingerprint] = {
                    folder: folderName,
                    filename,
                    savedAt: new Date().toISOString()
                }
            store.set('favouriteImages', favourites)
            return Boolean(favourites[fingerprint])
        }
    )

    ipcMain.handle(IPC_CHANNELS.setTags, async (event, outputPath, folderName, filename, tags) => {
        assertRequest(event)
        ;[outputPath, folderName, filename, tags] = parseIpcArguments(ipcSchemas.tags, [
            outputPath,
            folderName,
            filename,
            tags
        ])
        if (!Array.isArray(tags) || tags.length > 20)
            throw Object.assign(new Error('Invalid tags'), { code: 'INVALID_IPC_ARGUMENTS' })
        const filePath = configuredCroppedPath(currentSettings(), outputPath, folderName, filename)
        const { id } = await getImageMetadata(filePath)
        const normalized = [
            ...new Set(
                tags
                    .map((tag) => String(tag).trim())
                    .filter(Boolean)
                    .map((tag) => tag.slice(0, 40))
            )
        ]
        const imageTags = store.get('imageTags', {})
        if (normalized.length) imageTags[id] = normalized
        else delete imageTags[id]
        store.set('imageTags', imageTags)
        return normalized
    })

    ipcMain.handle(IPC_CHANNELS.deleteCropped, async (event, outputPath, images) => {
        assertRequest(event)
        ;[outputPath, images] = parseIpcArguments(ipcSchemas.images, [outputPath, images])
        outputPath = requireConfiguredRoot(
            outputPath,
            currentSettings().destinationFolderPath,
            'Destination'
        )
        if (!Array.isArray(images) || images.length > 1000)
            throw Object.assign(new Error('Invalid delete request'), {
                code: 'INVALID_IPC_ARGUMENTS'
            })
        const results = await mapWithConcurrency(images || [], 2, async (image) => {
            const folder = requireChildName(image.folder || '', 'folder name')
            const filename = requireChildName(image.name || '', 'filename')
            try {
                await shell.trashItem(
                    configuredCroppedPath(currentSettings(), outputPath, folder, filename)
                )
                directoryCatalog.invalidate(join(outputPath, 'cropped', folder))
                return { ok: true, folder, filename }
            } catch (error) {
                return { ok: false, folder, filename, error: error.message }
            }
        })
        return {
            deleted: results.filter((result) => result.ok),
            failed: results.filter((result) => !result.ok)
        }
    })
    ipcMain.handle(
        IPC_CHANNELS.cropScreenshots,
        async (
            event,
            inputPath,
            outputPath,
            keepOriginalImage,
            screenshotFilenames,
            cropConfiguration = {}
        ) => {
            assertRequest(event)
            ;[
                inputPath,
                outputPath,
                keepOriginalImage,
                screenshotFilenames,
                cropConfiguration = {}
            ] = parseIpcArguments(ipcSchemas.crop, [
                inputPath,
                outputPath,
                keepOriginalImage,
                screenshotFilenames,
                cropConfiguration
            ])
            inputPath = requireConfiguredRoot(
                inputPath,
                currentSettings().screenshotFolderPath,
                'Screenshot'
            )
            outputPath = requireConfiguredRoot(
                outputPath,
                currentSettings().destinationFolderPath,
                'Destination'
            )
            if (
                !Array.isArray(screenshotFilenames) ||
                screenshotFilenames.length === 0 ||
                screenshotFilenames.length > 1000 ||
                typeof keepOriginalImage !== 'boolean'
            )
                throw Object.assign(new Error('Invalid crop request'), {
                    code: 'INVALID_IPC_ARGUMENTS'
                })
            const filenames = screenshotFilenames.map((filename) =>
                requireChildName(filename, 'filename')
            )
            logger.info('crop.started', { count: filenames.length })
            mainWindow.setProgressBar(0)
            try {
                const result = await cropTransactionService.crop({
                    inputPath,
                    outputPath,
                    keepOriginalImage,
                    filenames,
                    cropConfiguration,
                    onProgress: (progress) => {
                        mainWindow.setProgressBar(progress)
                        mainWindow.webContents.send(IPC_CHANNELS.operationProgress, {
                            type: 'crop',
                            value: progress
                        })
                    }
                })
                if (result.success) {
                    directoryCatalog.invalidate(inputPath)
                    directoryCatalog.invalidate(join(outputPath, 'cropped'))
                    imageIndex.invalidate(inputPath)
                }
                logger.info('crop.finished', {
                    success: result.success,
                    batchId: result.batchId,
                    errors: result.errors
                })
                return result
            } finally {
                mainWindow.setProgressBar(-1)
            }
        }
    )

    ipcMain.handle(IPC_CHANNELS.undoLastCrop, async (event) => {
        assertRequest(event)
        mainWindow.setProgressBar(2, { mode: 'indeterminate' })
        try {
            const result = await cropTransactionService.undo()
            directoryCatalog.clear()
            imageIndex.invalidate()
            return result
        } finally {
            mainWindow.setProgressBar(-1)
        }
    })
    ipcMain.handle(IPC_CHANNELS.getCropBatches, (event) => {
        assertRequest(event)
        return cropTransactionService.getHistory()
    })
    ipcMain.handle(IPC_CHANNELS.undoCropBatch, async (event, id) => {
        assertRequest(event)
        ;[id] = parseIpcArguments(ipcSchemas.batch, [id])
        mainWindow.setProgressBar(2, { mode: 'indeterminate' })
        try {
            const result = await cropTransactionService.undo(id)
            directoryCatalog.clear()
            imageIndex.invalidate()
            return result
        } finally {
            mainWindow.setProgressBar(-1)
        }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(async () => {
    await recoverConfiguredFolders()
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.rpuk.screenshotcropper')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    await recoverInterruptedCropBatches()
    createWindow()
    const cacheCleanupTimer = setTimeout(
        () =>
            cleanThumbnailCache().catch((error) =>
                console.error('Thumbnail cache cleanup failed', error)
            ),
        30_000
    )
    cacheCleanupTimer.unref?.()
    imageIndex.cleanup()
    tray = new Tray(icon)
    const updateTrayMenu = () =>
        tray.setContextMenu(
            Menu.buildFromTemplate([
                {
                    label: 'Show RPUK Screenshot Cropper',
                    click: () => {
                        const window = BrowserWindow.getAllWindows()[0]
                        window?.show()
                        window?.focus()
                    }
                },
                {
                    label: 'Pause folder monitoring',
                    type: 'checkbox',
                    checked: monitoringPaused,
                    click: (item) => {
                        monitoringPaused = item.checked
                        store.set('monitoringPaused', monitoringPaused)
                        folderMonitor?.setPaused(monitoringPaused)
                        updateTrayMenu()
                    }
                },
                { type: 'separator' },
                { label: 'Quit', click: () => app.quit() }
            ])
        )
    tray.setToolTip(`RPUK Screenshot Cropper v${app.getVersion()}`)
    tray.on('click', () => {
        const window = BrowserWindow.getAllWindows()[0]
        window?.show()
        window?.focus()
    })
    updateTrayMenu()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => imageIndex.flush())
