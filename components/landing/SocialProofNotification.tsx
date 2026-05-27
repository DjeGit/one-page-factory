'use client';

import { useEffect, useRef, useState } from 'react';

interface SocialProofNotificationProps {
  productName: string;
  viewCount?: number;
}

const NAMES = ['Marie', 'Thomas', 'Sophie', 'Lucas', 'Emma', 'Nicolas', 'Julie', 'Alexandre', 'Camille', 'Pierre'];
const CITIES = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes', 'Toulouse', 'Lille', 'Strasbourg', 'Rennes', 'Nice'];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type NotifType = 'viewers' | 'purchase';

interface NotifData {
  type: NotifType;
  count?: number;
  name?: string;
  city?: string;
}

function buildNotif(currentCount: number): NotifData {
  const type: NotifType = Math.random() < 0.5 ? 'viewers' : 'purchase';
  if (type === 'viewers') {
    return { type, count: currentCount };
  }
  return {
    type,
    name: NAMES[randomBetween(0, NAMES.length - 1)],
    city: CITIES[randomBetween(0, CITIES.length - 1)],
  };
}

export default function SocialProofNotification({ viewCount }: SocialProofNotificationProps) {
  const [notif, setNotif] = useState<NotifData | null>(null);
  const [animIn, setAnimIn] = useState(false);
  const viewersCountRef = useRef<number>(viewCount ?? randomBetween(12, 47));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotif() {
    const data = buildNotif(viewersCountRef.current);
    setNotif(data);
    setAnimIn(true);

    // Hide after 4s
    hideTimerRef.current = setTimeout(() => {
      setAnimIn(false);
      // Wait for exit animation then clear
      setTimeout(() => setNotif(null), 400);
    }, 4000);

    // Schedule next
    const nextDelay = randomBetween(15000, 45000);
    nextTimerRef.current = setTimeout(() => {
      // Update viewer count ±2
      viewersCountRef.current = Math.max(
        12,
        Math.min(47, viewersCountRef.current + randomBetween(-2, 2))
      );
      showNotif();
    }, nextDelay + 4400); // after current one finishes
  }

  useEffect(() => {
    // Wait 3s before first show
    const initTimer = setTimeout(showNotif, 3000);
    return () => {
      clearTimeout(initTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!notif) return null;

  return (
    <div
      className="fixed bottom-6 left-4 z-50 transition-all duration-400"
      style={{
        transform: animIn ? 'translateX(0)' : 'translateX(-120%)',
        opacity: animIn ? 1 : 0,
        transition: 'transform 0.4s ease, opacity 0.4s ease',
      }}
    >
      <div className="bg-white rounded-xl shadow-lg p-3 flex items-center gap-3 max-w-xs">
        {/* Avatar dot */}
        <div
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: notif.type === 'viewers' ? '#22c55e' : '#3b82f6' }}
        />

        {/* Text */}
        <div className="text-sm text-gray-700 leading-tight">
          {notif.type === 'viewers' ? (
            <span>
              <span className="text-red-500 font-bold">🔴</span>{' '}
              <span className="font-semibold">{notif.count}</span> personnes regardent ce produit en ce moment
            </span>
          ) : (
            <span>
              ✅ <span className="font-semibold">{notif.name}</span> de{' '}
              <span className="font-semibold">{notif.city}</span> vient de commander
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
