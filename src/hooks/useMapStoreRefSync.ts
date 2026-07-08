import { useEffect } from "react";

export function useMapStoreRefSync(
  latestStoreRef: React.RefObject<unknown>,
  latestSnapshotRef: React.RefObject<unknown>,
  mapStore: unknown,
  activeServerSnapshot: unknown
) {
  useEffect(() => {
    latestStoreRef.current = mapStore;
    latestSnapshotRef.current = activeServerSnapshot;
  }, [activeServerSnapshot, mapStore, latestStoreRef, latestSnapshotRef]);
}