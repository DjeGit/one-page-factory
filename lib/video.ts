/**
 * Extrait l'identifiant d'une vidéo YouTube à partir d'une adresse (watch, youtu.be, shorts, embed).
 * Renvoie null si l'adresse n'est pas une vidéo YouTube : seul YouTube est accepté, afin que la
 * politique de sécurité (frame-src) n'ait qu'un hôte à autoriser.
 */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/);
        if (m) id = m[2];
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
