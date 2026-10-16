/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.media-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ssl-images-amazon.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'tendpick.com', 'www.tendpick.com'],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Pixels publicitaires (audit E8) : PixelInjector charge Meta,
              // TikTok et GTM APRÈS consentement cookies ; sans ces hôtes la
              // CSP bloquait leurs scripts et leurs envois, donc aucun
              // événement ne remontait même consentement donné.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://ssl.google-analytics.com https://trends.google.com https://connect.facebook.net https://analytics.tiktok.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://*.tiktok.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
              "frame-src 'self' https://trends.google.com https://www.google.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // En-têtes de sécurité (audit E8). HSTS sans includeSubDomains ni
          // preload : on n'engage pas les sous-domaines (messagerie, etc.).
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
