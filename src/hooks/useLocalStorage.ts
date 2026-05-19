import { useEffect, useState } from "react";

type UseLocalStorageOptions<T> = {
  validate?: (value: unknown) => value is T;
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored) as unknown;
        if (!options?.validate || options.validate(parsed)) {
          return parsed as T;
        }
      }
    } catch {
      // Ignore parse errors
    }

    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}
