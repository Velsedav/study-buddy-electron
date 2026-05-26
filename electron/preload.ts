import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    execute: (dbName: 'main' | 'bingo', sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:execute', dbName, sql, params ?? []),
    select: <T>(dbName: 'main' | 'bingo', sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:select', dbName, sql, params ?? []) as Promise<T[]>,
  },

  fs: {
    getUserDataPath: (): Promise<string> =>
      ipcRenderer.invoke('fs:getUserDataPath'),
    readTextFile: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('fs:readTextFile', filePath),
    writeTextFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeTextFile', filePath, content),
    readFile: (filePath: string): Promise<Uint8Array> =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, data: Uint8Array): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', filePath, data),
    exists: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:exists', filePath),
    mkdir: (dirPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:mkdir', dirPath),
  },

  dialog: {
    openFile: (options?: object): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (options?: object): Promise<string | null> =>
      ipcRenderer.invoke('dialog:saveFile', options),
  },

  shell: {
    openPath: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('shell:openPath', filePath),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:openExternal', url),
  },

  autostart: {
    isEnabled: (): Promise<boolean> =>
      ipcRenderer.invoke('autostart:isEnabled'),
    setEnabled: (enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('autostart:setEnabled', enabled),
  },

  platform: process.platform,
})
