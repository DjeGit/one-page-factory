/**
 * Début de « aujourd'hui » pour les compteurs du tableau de bord.
 *
 * Avant : `new Date().setHours(0,0,0,0)` = minuit dans le fuseau du SERVEUR (UTC sur la plupart des hébergeurs) :
 * les « clics du jour » changeaient donc à 1 h ou 2 h du matin en Espagne. On fixe le fuseau de Jerome
 * (Europe/Madrid) pour que « aujourd'hui » commence à minuit, quel que soit le serveur.
 */
export const REPORTING_TIMEZONE = 'Europe/Madrid';

/** Décalage (ms) du fuseau `timeZone` par rapport à UTC à l'instant `at` (positif à l'est de Greenwich). */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  // On ignore les millisecondes de `at` des deux côtés
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Instant (ISO UTC) où commence le jour courant dans `timeZone`. */
export function startOfTodayIso(now: Date = new Date(), timeZone: string = REPORTING_TIMEZONE): string {
  const localParts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .split('-')
    .map(Number); // [année, mois, jour] du jour local
  const midnightAsUtc = Date.UTC(localParts[0], localParts[1] - 1, localParts[2]);
  // Deux passes : le décalage doit être celui de minuit lui-même (changement d'heure compris).
  let start = midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone);
  start = midnightAsUtc - zoneOffsetMs(new Date(start), timeZone);
  return new Date(start).toISOString();
}
