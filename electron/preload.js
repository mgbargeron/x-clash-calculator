const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  appName: 'Chest Multiplier',
  getMapData: () => ipcRenderer.invoke('map-storage:get'),
  setMapData: (data) => ipcRenderer.invoke('map-storage:set', data),
  getServerTimeData: () => ipcRenderer.invoke('server-time-storage:get'),
  setServerTimeData: (data) => ipcRenderer.invoke('server-time-storage:set', data)
})
