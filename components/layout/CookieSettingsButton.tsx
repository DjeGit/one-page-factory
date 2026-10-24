'use client';

import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/consent-copy';

/** Lien de pied de page « Gérer les cookies » : rouvre la bannière de consentement. */
export default function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
      className="text-left text-xs text-white/60 hover:text-white transition-colors"
    >
      {label}
    </button>
  );
}
