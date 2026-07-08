import { useEffect } from "react";

export function useAlarmNotification(
  upcomingAlarm: { event: { name?: string }; occurrence: Date; alarmKey: string } | null,
  lastNotifiedAlarmRef: React.RefObject<string | null>
) {
  useEffect(() => {
    if (!upcomingAlarm) return;
    if (lastNotifiedAlarmRef.current === upcomingAlarm.alarmKey) return;

    lastNotifiedAlarmRef.current = upcomingAlarm.alarmKey;
    playAlarmChime();

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const { name } = upcomingAlarm.event;
        const occurrenceStr = upcomingAlarm.occurrence.toLocaleString();
        new Notification("Server event coming up", {
          body: `${name || "Unnamed event"} starts at ${occurrenceStr}.`,
        });
      } catch {
        // Ignore Notification API issues.
      }
    }
  }, [upcomingAlarm]);
}

function playAlarmChime() {
  if (typeof window === "undefined") return;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.45);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Ignore audio API issues.
  }
}