'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_CHANGED_EVENT, type ConsentValue } from '@/lib/consent-copy';

interface PixelInjectorProps {
  pixelMeta?: string | null;
  pixelTiktok?: string | null;
  pixelGtm?: string | null;
}

function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem('tendpick_cookie_consent');
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export default function PixelInjector({ pixelMeta, pixelTiktok, pixelGtm }: PixelInjectorProps) {
  // Avant ce correctif, les pixels Meta/TikTok/GTM se déclenchaient au
  // chargement de la page quelle que soit la réponse au bandeau cookies —
  // désormais rien ne se charge tant que le visiteur n'a pas accepté.
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(readConsent() === 'accepted');

    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent<ConsentValue>).detail;
      setConsented(detail === 'accepted');
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChange);
  }, []);

  if (!consented) return null;

  return (
    <>
      {pixelMeta && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelMeta}');fbq('track', 'PageView');
            `.trim(),
          }}
        />
      )}

      {pixelTiktok && (
        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelTiktok}');ttq.page();}(window, document, 'ttq');
            `.trim(),
          }}
        />
      )}

      {pixelGtm && (
        <Script
          id="gtm-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${pixelGtm}');
            `.trim(),
          }}
        />
      )}
    </>
  );
}
