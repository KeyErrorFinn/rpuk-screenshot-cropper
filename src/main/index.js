import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import installExtension, { REACT_DEVELOPER_TOOLS} from 'electron-devtools-installer';
import { promises as fs } from 'fs';
import { join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import icon from '../../resources/icon.png?asset'
import { da } from 'zod/v4/locales';

const store = new Store()

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        frame: false,
        titleBarStyle: 'hidden',
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.mjs'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            // webSecurity: false,
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })


    // WINDOW LOGIC
    ipcMain.on('window:minimize', () => {
        mainWindow.minimize()
    })
    ipcMain.on('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    })
    ipcMain.on('window:close', () => {
        mainWindow.close()
    })
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window:maximized')
    })
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window:restored')
    })


    // Folder Selection
    ipcMain.handle('dialog:selectFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })
        return result.filePaths[0]
    })


    // Storage
    ipcMain.handle('storage:get', (_, key) => {
        return store.get(key)
    })
    ipcMain.handle('storage:set', (_, key, value) => {
        store.set(key, value)
        return true
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })


    // Get Screenshots
    ipcMain.handle("images:get-screenshots", async (_, folderPath) => {
        if (!folderPath) return [];

        const files = await fs.readdir(folderPath);
        const validExtensions = [".png",".jpg",".jpeg",".webp"];
        
        const images = await Promise.all(
            files.filter(f => validExtensions.includes(extname(f).toLowerCase()))
                .map(async f => {
                    const path = join(folderPath, f);
                    const buffer = await fs.readFile(path);
                    const stats = await fs.stat(path);
                    return { name: f, buffer, modified: stats.mtime };
                })
        );

        images.sort((a, b) => b.modified - a.modified);

        return images;
    });


    // Get Cropped Images
    ipcMain.handle("images:get-cropped-folders", async (_, croppedPath) => {
        if (!croppedPath) return {};

        const entries = await fs.readdir(croppedPath, { withFileTypes: true });

        // Parse folder names as dates and sort them newest → oldest
        const dateFolders = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((a, b) => {
                const [da, ma, ya] = a.split('-').map(Number);
                const [db, mb, yb] = b.split('-').map(Number);

                const dateA = new Date(2000 + ya, ma - 1, da);
                const dateB = new Date(2000 + yb, mb - 1, db);

                return dateB - dateA; // newest first
            });

        const dateFoldersInfo = await Promise.all(
            dateFolders.map(async (folder) => {
                const folderPath = join(croppedPath, folder);
                const entries = await fs.readdir(folderPath, { withFileTypes: true });
                const files = entries
                    .filter(file => file.isFile());

                return { folderName: folder, imageCount: files.length };
            })
        )
        
        return dateFoldersInfo

        // const result = {};
        // for (const folder of dateFolders) {
        //     const folderPath = join(croppedPath, folder);
        //     const files = await fs.readdir(folderPath, { withFileTypes: true });

        //     // Read files with metadata
        //     let imageData = await Promise.all(
        //         files
        //         .filter(entry => entry.isFile())
        //         .map(async entry => {
        //             const filePath = join(folderPath, entry.name);
        //             const buffer = await fs.readFile(filePath);
        //             const stats = await fs.stat(filePath);
        //             return {
        //                 name: entry.name,
        //                 buffer,              // raw file buffer
        //                 modified: stats.mtime, // Date object
        //             };
        //         })
        //     );

        //     // Sort images newest → oldest
        //     imageData.sort((a, b) => b.modified - a.modified);

        //     result[folder] = imageData;
        // }

        // return result;
    });


    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}


app.whenReady().then(() => {
    installExtension(REACT_DEVELOPER_TOOLS)
        .then((ext) => console.log(`Added Extension:  ${ext.name}`))
        .catch((err) => console.log('An error occurred: ', err));

        
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
