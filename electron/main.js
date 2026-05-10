const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

const mapDataPath = () => path.join(app.getPath('userData'), 'game-map-data.json')

ipcMain.handle('map-storage:get', async () => {
  try {
    const raw = await fs.readFile(mapDataPath(), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    console.error('Failed to read map data', error)
    return null
  }
})

ipcMain.handle('map-storage:set', async (_event, data) => {
  try {
    await fs.mkdir(path.dirname(mapDataPath()), { recursive: true })
    await fs.writeFile(mapDataPath(), JSON.stringify(data, null, 2), 'utf8')
    return { ok: true }
  } catch (error) {
    console.error('Failed to save map data', error)
    return { ok: false, error: error.message }
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Suppress this specific Electron macOS framework warning (cosmetic only)
  const origError = console.error
  console.error = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes('representedObject is not a WeakPtrToElectronMenuModelAsNSObject')) {
      return // Silence this warning
    }
    origError.apply(console, args)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
