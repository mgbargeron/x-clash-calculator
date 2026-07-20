import { useEffect } from "react";

export function useBeforeUnloadSave(onSave: () => void) {
  useEffect(() => {
    window.addEventListener("beforeunload", onSave);
    return () => {
      window.removeEventListener("beforeunload", onSave);
    };
  }, [onSave]);
}