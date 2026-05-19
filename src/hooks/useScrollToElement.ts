import { useEffect, useRef } from "react";

type UseScrollToElementProps = {
  listRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
  triggerId: unknown;
};

export function useScrollToElement({ listRef, targetRef, triggerId }: UseScrollToElementProps) {
  const lastTriggeredId = useRef<unknown>(null);

  useEffect(() => {
    const listElement = listRef.current;
    const targetElement = targetRef.current;

    if (!listElement || !targetElement) return;

    // Use JSON.stringify for deep comparison of arrays/objects
    const currentIdStr = typeof triggerId === "string" ? triggerId : JSON.stringify(triggerId);
    if (lastTriggeredId.current === currentIdStr || lastTriggeredId.current === triggerId) return;

    targetElement.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "smooth",
    });

    lastTriggeredId.current = triggerId;
  }, [triggerId]);
}
