'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CONSENT_CHANGED_EVENT, type ConsentValue } from '@/lib/consent-copy';
import { SESSION_STORAGE_KEY } from '@/lib/visitor-tracking';

/**
 * Mesure d'audience maison (24/10/2026) : visiteurs qui reviennent, pages
 * consultées, temps passé. Ne fait RIEN tant que le visiteur n'a pas cliqué
 * « Accepter » dans la bannière de cookies ; respecte aussi les signaux
 * « Ne pas me suivre » et Global Privacy Control du navigateur.
 *
 * Fonctionnement : une page vue est envoyée à /api/visit à chaque
 * changement de page ; le temps ACTIF (onglet visible) est envoyé en une
 * balise quand la page est quittée ou masquée. Au retrait du consentement,
 * l'API efface le cookie et les données du visiteur.
 */
const CONSENT_KEY = 'tendpick_cookie_consent';

interface CurrentVisit {
  id: string | null;
  activeMs: number;
  since: number | null;
}

function privacySignal(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted' && !privacySignal();
  } catch {
    return false;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export default function VisitTracker() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  const visit = useRef<CurrentVisit | null>(null);

  // Lecture du consentement au chargement, puis à chaque changement de choix.
  useEffect(() => {
    setConsented(hasConsent());
    const onChange = (e: Event) => {
      const value = (e as CustomEvent<ConsentValue>).detail;
      if (value === 'accepted') {
        setConsented(hasConsent());
      } else {
        setConsented(false);
        // Retrait : l'API supprime le cookie et les données de ce visiteur.
        fetch('/api/visit', { method: 'DELETE', keepalive: true }).catch(() => {});
      }
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  // Une page vue par changement de page, tant que le consentement est donné.
  useEffect(() => {
    if (!consented || !pathname) return;

    let sessionId: string | null = null;
    let newSession = false;
    try {
      sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionId) {
        sessionId = newId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        newSession = true;
      }
    } catch {
      return; // stockage indisponible : on ne mesure pas
    }

    const current: CurrentVisit = {
      id: null,
      activeMs: 0,
      since: document.visibilityState === 'visible' ? Date.now() : null,
    };
    visit.current = current;

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'view',
        sid: sessionId,
        newSession,
        path: pathname,
        referrer: newSession ? document.referrer : '',
      }),
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && typeof json.visitId === 'string') current.id = json.visitId;
      })
      .catch(() => {});

    // Envoie le temps actif cumulé de CETTE page (le serveur garde la dernière valeur).
    const sendEnd = () => {
      if (!current.id) return;
      const total = current.activeMs + (current.since ? Date.now() - current.since : 0);
      const seconds = Math.round(total / 1000);
      if (seconds < 1) return;
      const payload = JSON.stringify({ event: 'end', visitId: current.id, seconds });
      try {
        navigator.sendBeacon('/api/visit', new Blob([payload], { type: 'application/json' }));
      } catch {
        // pas de balise disponible : la durée de cette page restera inconnue
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (current.since) {
          current.activeMs += Date.now() - current.since;
          current.since = null;
        }
        sendEnd();
      } else if (!current.since) {
        current.since = Date.now();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
      // Changement de page ou retrait du consentement : on clôture cette page.
      if (current.since) {
        current.activeMs += Date.now() - current.since;
        current.since = null;
      }
      sendEnd();
    };
  }, [consented, pathname]);

  return null;
}
