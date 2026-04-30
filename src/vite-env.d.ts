/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    appName: string
    getMapData?: () => Promise<unknown>
    setMapData?: (data: unknown) => Promise<{ ok: boolean; error?: string }>
  }
}
