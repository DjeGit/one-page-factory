import { NextRequest, NextResponse } from 'next/server';
import { findDataSource, findSocialChannel } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = findDataSource(params.id) || findSocialChannel(params.id);
  if (!client) return NextResponse.json({ error: 'Intégration inconnue' }, { status: 404 });

  const result = await client.testConnection();
  return NextResponse.json(result);
}
