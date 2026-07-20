import { useEffect } from "react";

export function useLevelInputSync(
  value: number,
  setInputValue: (value: string) => void
) {
  useEffect(() => {
    setInputValue(String(value));
  }, [value, setInputValue]);
}