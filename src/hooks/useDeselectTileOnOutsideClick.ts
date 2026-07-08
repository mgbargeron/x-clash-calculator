import { useEffect } from "react";

export function useDeselectTileOnOutsideClick(
  boardRef: React.RefObject<HTMLElement | null>,
  onChangeSelectedTile: (tileId: string) => void
) {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!boardRef.current) return;
      if (boardRef.current.contains(event.target as Node)) return;

      onChangeSelectedTile("");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [boardRef, onChangeSelectedTile]);
}