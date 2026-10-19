import { NextResponse } from 'next/server';

/**
 * Sonde de santé légère pour /usr/local/bin/opf-monitor.sh (cron toutes les
 * 10 min). Volontairement SANS accès base de données : elle ne dit que « le
 * process Next répond ». Avant ce fichier la route n'existait pas : le
 * monitor recevait un 404, concluait à une panne et redémarrait opf toutes
 * les 10 minutes (démarrages à froid + cache mémoire vidé).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}

export function HEAD() {
  return new NextResponse(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
