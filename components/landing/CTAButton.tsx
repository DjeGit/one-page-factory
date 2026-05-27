'use client';

import { useState } from 'react';

interface CTAButtonProps {
  redirectCode: string;
  productId: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary';
}

export default function CTAButton({
  redirectCode,
  productId,
  label = 'Acheter maintenant',
  className = '',
  size = 'lg',
  variant = 'primary',
}: CTAButtonProps) {
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const variantClasses = {
    primary: 'bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/30 hover:shadow-accent-500/50',
    secondary: 'bg-white hover:bg-gray-50 text-primary-700 border-2 border-primary-600',
  };

  async function handleClick() {
    setLoading(true);
    try {
      // Fire-and-forget analytics
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type: 'click' }),
      }).catch(() => {});
    } finally {
      // Navigate immediately, don't wait for analytics
      window.location.href = `/api/go/${redirectCode}`;
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        font-bold rounded-xl transition-all duration-200
        transform active:scale-95 hover:scale-105
        inline-flex items-center gap-2 cursor-pointer
        disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Redirection...
        </>
      ) : (
        <>
          {label}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </>
      )}
    </button>
  );
}
