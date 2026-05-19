export interface ElectronAPI {
  getMapData: () => Promise<unknown>;
  setMapData: (data: unknown) => Promise<{ ok: boolean; error?: string }>;
  getServerTimeData: () => Promise<unknown>;
  setServerTimeData: (data: unknown) => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
