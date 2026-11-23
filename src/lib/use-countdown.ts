"use client";

import { useEffect, useRef, useState } from "react";

/** Seconds left on a clock that starts when `running` first turns on and ticks down one second at a time. */
export function useCountdown(totalSeconds: number, running: boolean, done: boolean) {
  const startedAt = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    if (startedAt.current === null) startedAt.current = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - (startedAt.current ?? Date.now())), 200);
    return () => window.clearInterval(id);
  }, [running]);
  if (done) return 0;
  return Math.max(0, totalSeconds - Math.floor(elapsed / 1000));
}

export const clockLabel = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
