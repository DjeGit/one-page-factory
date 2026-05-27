import { notFound } from 'next/navigation';
import { getTemplate, TEMPLATES } from '@/lib/templates';
import { MOCK_PRODUCT, MOCK_OVERRIDES } from '@/lib/mock-product';
import TemplateRenderer from '@/components/templates/TemplateRenderer';
import PreviewAdminBar from '@/components/admin/design/PreviewAdminBar';

interface Props {
  params: { templateId: string };
}

export async function generateStaticParams() {
  return TEMPLATES.map((t) => ({ templateId: t.id }));
}

export default function PreviewPage({ params }: Props) {
  const template = TEMPLATES.find((t) => t.id === params.templateId);
  if (!template) notFound();

  return (
    <>
      {/* Barre admin flottante */}
      <PreviewAdminBar templateName={template.name} templateEmoji={template.emoji} templateId={params.templateId} />

      {/* Rendu full-size du template avec données mock */}
      <div style={{ paddingTop: 48 }}>
        <TemplateRenderer
          product={MOCK_PRODUCT}
          template={template}
          overrides={MOCK_OVERRIDES}
          scale={1}
        />
      </div>
    </>
  );
}
