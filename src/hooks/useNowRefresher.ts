import { useEffect, useState } from "react";

export function useNowRefresher(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const timer = window.setInterval(refreshNow, 60_000);
    const onFocus = () => refreshNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshNow();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return now;
}