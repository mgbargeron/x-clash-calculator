const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  appName: 'Chest Multiplier',
  getMapData: () => ipcRenderer.invoke('map-storage:get'),
  setMapData: (data) => ipcRenderer.invoke('map-storage:set', data)
})
