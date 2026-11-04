import { NextRequest, NextResponse } from 'next/server';
import { listIntegrationsWithStatus } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { unauthorized } from '../_lib/http';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();
  try {
    const data = await listIntegrationsWithStatus();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/integrations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
