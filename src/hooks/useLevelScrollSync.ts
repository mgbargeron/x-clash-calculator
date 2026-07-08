import { useEffect } from "react";

export function useLevelScrollSync(
  achievedLevel: number,
  levelListRef: React.RefObject<HTMLDivElement | null>,
  currentLevelRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (achievedLevel <= 1) return;
    const listElement = levelListRef.current;
    const targetElement = currentLevelRef.current;
    if (!listElement || !targetElement) return;

    const listRect = listElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const relativeTop = targetRect.top - listRect.top;

    listElement.scrollTo({ top: listElement.scrollTop + relativeTop, behavior: "smooth" });
  }, [achievedLevel]);
}