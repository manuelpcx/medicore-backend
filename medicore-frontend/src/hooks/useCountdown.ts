import { useEffect, useState } from 'react';

interface CountdownResult {
  minutes: string;
  seconds: string;
  totalSeconds: number;
  expired: boolean;
}

/**
 * Cuenta regresiva hasta `expiresAt`.
 * Se actualiza cada segundo. `expired` es true cuando totalSeconds <= 0.
 */
export function useCountdown(expiresAt: Date | null): CountdownResult {
  const [totalSeconds, setTotalSeconds] = useState<number>(() =>
    expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!expiresAt) { setTotalSeconds(0); return; }

    const tick = () => {
      const secs = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setTotalSeconds(secs);
    };

    tick(); // immediate first tick
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return { minutes, seconds, totalSeconds, expired: totalSeconds <= 0 };
}
