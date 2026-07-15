/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    appName: string
    getMapData?: (season?: number) => Promise<unknown>
    setMapData?: (data: unknown, season?: number) => Promise<{ ok: boolean; error?: string }>
    getServerTimeData?: () => Promise<unknown>
    setServerTimeData?: (data: unknown) => Promise<{ ok: boolean; error?: string }>
  }
}
