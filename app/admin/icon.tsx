import { ImageResponse } from 'next/og';

// Favicon dédié au back-office One Page Factory (one-page-factory.com),
// distinct de celui du site public Tendpick — reprend le même dégradé
// et le même pictogramme éclair que le logo de la Sidebar admin.
// Scopé au segment /admin par la convention de fichier Next.js (icon.tsx).

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          borderRadius: 8,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
