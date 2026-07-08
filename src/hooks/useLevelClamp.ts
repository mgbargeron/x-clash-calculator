import { useEffect, useRef } from "react";

const MAX_HERO_LEVEL = 150;

function clampLevel(level: number) {
  return Math.min(Math.max(level, 1), MAX_HERO_LEVEL);
}

export function useStartLevelClamp(
  startLevel: number,
  setStartLevel: React.Dispatch<React.SetStateAction<number>>
) {
  const setStartLevelRef = useRef(setStartLevel);
  setStartLevelRef.current = setStartLevel;

  useEffect(() => {
    if (!Number.isFinite(startLevel)) {
      setStartLevelRef.current(clampLevel(1));
    } else if (startLevel < 1 || startLevel > MAX_HERO_LEVEL) {
      setStartLevelRef.current(clampLevel(startLevel));
    }
  }, [startLevel]);
}

export function useDesiredLevelClamp(
  desiredLevel: number,
  setDesiredLevel: React.Dispatch<React.SetStateAction<number>>,
  startLevel: number
) {
  const setDesiredLevelRef = useRef(setDesiredLevel);
  setDesiredLevelRef.current = setDesiredLevel;

  useEffect(() => {
    if (!Number.isFinite(desiredLevel)) {
      setDesiredLevelRef.current(clampLevel(MAX_HERO_LEVEL));
    } else if (desiredLevel < 1 || desiredLevel > MAX_HERO_LEVEL) {
      setDesiredLevelRef.current(clampLevel(desiredLevel));
    } else if (desiredLevel < startLevel) {
      setDesiredLevelRef.current(startLevel);
    }
  }, [desiredLevel, startLevel]);
}