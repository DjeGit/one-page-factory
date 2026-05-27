'use client';

import Link from 'next/link';

interface Props {
  templateName: string;
  templateEmoji: string;
  templateId: string;
}

export default function PreviewAdminBar({ templateName, templateEmoji, templateId }: Props) {
  const handleViewSource = () => {
    window.open(`view-source:${window.location.href}`, '_blank');
  };

  const handleCopySource = async () => {
    try {
      const html = document.documentElement.outerHTML;
      await navigator.clipboard.writeText(html);
      const btn = document.getElementById('copy-btn');
      if (btn) {
        btn.textContent = '✅ Copié !';
        setTimeout(() => { btn.textContent = '📋 Copier HTML'; }, 2000);
      }
    } catch {
      alert('Utilisez Ctrl+U / Cmd+U pour voir la source dans votre navigateur.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'rgba(15, 10, 30, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(124, 58, 237, 0.35)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 10,
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Retour Design Studio */}
      <Link
        href="/admin/design"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'rgba(255,255,255,0.7)',
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 600,
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.12)',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      >
        ← Design Studio
      </Link>

      {/* Séparateur */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* Nom du template */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 14 }}>{templateEmoji}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{templateName}</span>
        <span style={{
          fontSize: 10,
          color: '#7C3AED',
          background: 'rgba(124,58,237,0.15)',
          padding: '2px 8px',
          borderRadius: 20,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          APERÇU
        </span>
      </div>

      {/* Bouton voir source HTML */}
      <button
        onClick={handleViewSource}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: '#A78BFA',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.3)',
          fontSize: 11,
          fontWeight: 700,
          padding: '5px 12px',
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; }}
        title="Ouvrir view-source dans un nouvel onglet"
      >
        <span style={{ fontSize: 13 }}>{'</>'}</span>
        Voir source HTML
      </button>

      {/* Bouton copier HTML */}
      <button
        id="copy-btn"
        onClick={handleCopySource}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 11,
          fontWeight: 600,
          padding: '5px 12px',
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        title="Copier tout le HTML dans le presse-papier"
      >
        📋 Copier HTML
      </button>

      {/* Bouton utiliser ce template */}
      <Link
        href={`/admin/products/new?template=${templateId}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: '#fff',
          background: '#7C3AED',
          border: 'none',
          fontSize: 11,
          fontWeight: 700,
          padding: '5px 14px',
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#6D28D9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#7C3AED'; }}
      >
        + Créer un produit avec ce template
      </Link>
    </div>
  );
}
