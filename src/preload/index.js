import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onWindowMaximize: (callback) => ipcRenderer.on('window:maximized', callback),
    onWindowRestore: (callback) => ipcRenderer.on('window:restored', callback),

    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

    getStorage: (key) => ipcRenderer.invoke('storage:get', key),
    setStorage: (key, value) => ipcRenderer.invoke('storage:set', key, value)
}

try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
} catch (error) {
    console.error(error)
}
