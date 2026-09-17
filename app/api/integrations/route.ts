import { NextRequest, NextResponse } from 'next/server';
import { listIntegrationsWithStatus } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await listIntegrationsWithStatus();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/integrations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
