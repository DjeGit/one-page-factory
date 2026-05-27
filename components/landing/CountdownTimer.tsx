'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  storageKey: string;
}

export default function CountdownTimer({ storageKey }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const key = `countdown_${storageKey}`;

    // Get or initialize the countdown
    const stored = localStorage.getItem(key);
    let endTime: number;

    if (stored) {
      endTime = parseInt(stored, 10);
      // If already expired, reset
      if (endTime < Date.now()) {
        // Reset with a new random time between 2-24h
        const hours = 2 + Math.random() * 22;
        endTime = Date.now() + hours * 60 * 60 * 1000;
        localStorage.setItem(key, endTime.toString());
      }
    } else {
      // Random between 2-24 hours
      const hours = 2 + Math.random() * 22;
      endTime = Date.now() + hours * 60 * 60 * 1000;
      localStorage.setItem(key, endTime.toString());
    }

    // Set initial value
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);

    // Update every second
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Reset the timer
        localStorage.removeItem(key);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [storageKey]);

  if (!mounted || timeLeft === null) {
    return null;
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="bg-gradient-to-r from-red-950 to-red-900 border border-red-800/50 rounded-2xl p-6 text-center">
      <p className="text-red-300 font-semibold uppercase tracking-wider text-xs mb-3">
        ⚠️ Offre à durée limitée — Expire dans
      </p>

      <div className="flex items-center justify-center gap-3">
        {/* Hours */}
        <div className="bg-red-800/60 rounded-xl px-4 py-3 min-w-[64px]">
          <div className="text-3xl font-black text-white tabular-nums">{pad(hours)}</div>
          <div className="text-red-400 text-xs mt-1">heures</div>
        </div>

        <span className="text-2xl font-black text-red-400 mb-4">:</span>

        {/* Minutes */}
        <div className="bg-red-800/60 rounded-xl px-4 py-3 min-w-[64px]">
          <div className="text-3xl font-black text-white tabular-nums">{pad(minutes)}</div>
          <div className="text-red-400 text-xs mt-1">minutes</div>
        </div>

        <span className="text-2xl font-black text-red-400 mb-4">:</span>

        {/* Seconds */}
        <div className="bg-red-800/60 rounded-xl px-4 py-3 min-w-[64px]">
          <div className="text-3xl font-black text-white tabular-nums animate-pulse">{pad(seconds)}</div>
          <div className="text-red-400 text-xs mt-1">secondes</div>
        </div>
      </div>

      <p className="text-red-400 text-sm mt-3">
        Après ce délai, le prix normal sera rétabli.
      </p>
    </div>
  );
}
