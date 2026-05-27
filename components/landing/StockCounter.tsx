'use client';

import { useState, useEffect } from 'react';

interface StockCounterProps {
  storageKey: string;
}

export default function StockCounter({ storageKey }: StockCounterProps) {
  const [stock, setStock] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [decremented, setDecremented] = useState(false);

  useEffect(() => {
    setMounted(true);
    const key = `stock_${storageKey}`;
    const stored = localStorage.getItem(key);
    let currentStock: number;

    if (stored) {
      currentStock = parseInt(stored, 10);
      // If it was somehow reset to 0, restore to a low value
      if (currentStock <= 0) {
        currentStock = 3 + Math.floor(Math.random() * 5);
        localStorage.setItem(key, currentStock.toString());
      }
    } else {
      // Random between 3-12
      currentStock = 3 + Math.floor(Math.random() * 10);
      localStorage.setItem(key, currentStock.toString());
    }

    setStock(currentStock);

    // Decrement randomly every 30-120 seconds
    const scheduleDecrement = () => {
      const delay = (30 + Math.random() * 90) * 1000;
      return setTimeout(() => {
        setStock((prev) => {
          if (prev === null || prev <= 1) return prev;
          const newStock = prev - 1;
          localStorage.setItem(key, newStock.toString());
          setDecremented(true);
          setTimeout(() => setDecremented(false), 2000);
          return newStock;
        });
        scheduleDecrement();
      }, delay);
    };

    const timeout = scheduleDecrement();
    return () => clearTimeout(timeout);
  }, [storageKey]);

  if (!mounted || stock === null) return null;

  const urgency = stock <= 3 ? 'critical' : stock <= 6 ? 'warning' : 'normal';

  const urgencyConfig = {
    critical: {
      bg: 'from-red-950 to-red-900',
      border: 'border-red-700/50',
      text: 'text-red-300',
      badge: 'bg-red-500',
      icon: '🔴',
      label: 'Rupture imminente !',
    },
    warning: {
      bg: 'from-orange-950 to-orange-900',
      border: 'border-orange-700/50',
      text: 'text-orange-300',
      badge: 'bg-orange-500',
      icon: '🟠',
      label: 'Stock très limité',
    },
    normal: {
      bg: 'from-amber-950 to-amber-900',
      border: 'border-amber-700/50',
      text: 'text-amber-300',
      badge: 'bg-amber-500',
      icon: '🟡',
      label: 'Stock limité',
    },
  };

  const config = urgencyConfig[urgency];

  return (
    <div
      className={`bg-gradient-to-r ${config.bg} border ${config.border} rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 ${
        decremented ? 'scale-102 ring-2 ring-red-500/50' : ''
      }`}
    >
      {/* Icon */}
      <div className="text-2xl flex-shrink-0 animate-pulse">{config.icon}</div>

      {/* Content */}
      <div className="flex-1">
        <div className={`font-semibold ${config.text} flex items-center gap-2`}>
          <span>{config.label}</span>
          {decremented && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-fade-in">
              -1 vendu
            </span>
          )}
        </div>
        <div className="text-white font-black text-lg">
          Plus que{' '}
          <span
            className={`${config.badge} text-white px-2 py-0.5 rounded-lg inline-block transition-all duration-300 ${
              decremented ? 'scale-110' : ''
            }`}
          >
            {stock}
          </span>{' '}
          unités disponibles
        </div>
      </div>

      {/* Progress bar */}
      <div className="hidden sm:block w-32 flex-shrink-0">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Disponible</span>
          <span>{stock}/{Math.max(stock, 15)}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.badge} rounded-full transition-all duration-1000`}
            style={{ width: `${(stock / 15) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
