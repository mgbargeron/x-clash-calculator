const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  appName: 'Chest Multiplier',
  getMapData: (season) => ipcRenderer.invoke('map-storage:get', season),
  setMapData: (data, season) => ipcRenderer.invoke('map-storage:set', data, season),
  getServerTimeData: () => ipcRenderer.invoke('server-time-storage:get'),
  setServerTimeData: (data) => ipcRenderer.invoke('server-time-storage:set', data)
})
