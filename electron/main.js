const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

const mapDataPath = () => path.join(app.getPath('userData'), 'game-map-data.json')
const seasonMapDataPath = (season) => path.join(app.getPath('userData'), `game-map-season-${season}.json`)
const legacySeasonMapDataPath = (season) => path.join(app.getPath('userData'), `game-map-data-s${season}.json`)
const serverTimeDataPath = () => path.join(app.getPath('userData'), 'server-time-data.json')

function normalizeSeason(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function formatError(error) {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error && typeof error.message === 'string') return error.message
  return String(error)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildErrorPage(title, detail) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        background: #10131d;
        color: #f5f7ff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: grid;
        place-items: center;
      }
      main {
        width: min(720px, calc(100vw - 32px));
        padding: 24px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 1.1rem;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #c8d4ff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(detail)}</pre>
    </main>
  </body>
</html>`)}`
}

ipcMain.handle('map-storage:get', async (_event, seasonValue) => {
  const season = normalizeSeason(seasonValue)

  try {
    const raw = await fs.readFile(seasonMapDataPath(season), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        const raw = await fs.readFile(legacySeasonMapDataPath(season), 'utf8')
        return JSON.parse(raw)
      } catch (legacySeasonError) {
        if (legacySeasonError.code !== 'ENOENT') {
          console.error('Failed to read legacy season map data', legacySeasonError)
        }
      }

      if (season !== 1) return null

      try {
        const raw = await fs.readFile(mapDataPath(), 'utf8')
        return JSON.parse(raw)
      } catch (legacyError) {
        if (legacyError.code !== 'ENOENT') {
          console.error('Failed to read legacy map data', legacyError)
        }

        return null
      }
    }

    console.error('Failed to read map data', error)
    return null
  }
})

ipcMain.handle('map-storage:set', async (_event, data, seasonValue) => {
  const season = normalizeSeason(seasonValue)
  const dataPath = seasonMapDataPath(season)

  try {
    await fs.mkdir(path.dirname(dataPath), { recursive: true })
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8')
    return { ok: true }
  } catch (error) {
    console.error('Failed to save map data', error)
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('server-time-storage:get', async () => {
  try {
    const raw = await fs.readFile(serverTimeDataPath(), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    console.error('Failed to read server time data', error)
    return null
  }
})

ipcMain.handle('server-time-storage:set', async (_event, data) => {
  try {
    await fs.mkdir(path.dirname(serverTimeDataPath()), { recursive: true })
    await fs.writeFile(serverTimeDataPath(), JSON.stringify(data, null, 2), 'utf8')
    return { ok: true }
  } catch (error) {
    console.error('Failed to save server time data', error)
    return { ok: false, error: error.message }
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#10131d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.on('did-finish-load', () => {
    win.show()
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    const detail = [
      `Code: ${errorCode}`,
      `Message: ${errorDescription}`,
      `URL: ${validatedURL}`
    ].join('\n')

    console.error('Renderer failed to load', detail)
    win.loadURL(buildErrorPage('Failed to load renderer', detail))
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    const detail = JSON.stringify(details, null, 2)
    console.error('Renderer process exited', detail)
    win.loadURL(buildErrorPage('Renderer process exited', detail))
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    win.loadFile(indexPath).catch((error) => {
      const detail = `Path: ${indexPath}\nMessage: ${formatError(error)}`
      console.error('Failed to open bundled index.html', detail)
      win.loadURL(buildErrorPage('Failed to open bundled app', detail))
    })
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
