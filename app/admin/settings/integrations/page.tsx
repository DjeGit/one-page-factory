import { listIntegrationsWithStatus } from '@/lib/integrations/registry';
import IntegrationsManager from '@/components/admin/settings/IntegrationsManager';

export const dynamic = 'force-dynamic';

export default async function IntegrationsSettingsPage() {
  const { dataSources, socialChannels } = await listIntegrationsWithStatus();

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Intégrations</h1>
        <p className="text-gray-500 mt-1">
          Sources de données pour l&apos;étude de marché et canaux de diffusion réseaux sociaux.
          Toutes désactivées par défaut — active uniquement ce dont tu as besoin.
        </p>
      </div>
      <IntegrationsManager initialDataSources={dataSources} initialSocialChannels={socialChannels} />
    </div>
  );
}
