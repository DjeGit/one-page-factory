'use client';

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { MARKETS } from '@/lib/market';
import { useMarket } from '@/lib/market-context';

export default function MarketSwitcher() {
  const { market, setMarket, isPending } = useMarket();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MARKETS.find((m) => m.code === market) ?? MARKETS[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white',
          'font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-all',
          isPending && 'opacity-60 cursor-wait'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
        >
          {MARKETS.map((m) => (
            <button
              key={m.code}
              type="button"
              role="option"
              aria-selected={m.code === market}
              onClick={() => {
                setMarket(m.code);
                setOpen(false);
              }}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                m.code === market
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="text-lg leading-none">{m.flag}</span>
              {m.label}
              {m.code === market && (
                <svg className="w-4 h-4 ml-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
