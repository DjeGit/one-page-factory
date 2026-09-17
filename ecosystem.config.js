require('dotenv').config({ path: '/var/www/one-page-factory/.env.local' });

module.exports = {
  apps: [{
    name: 'opf',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/one-page-factory',
    env: {
      NODE_ENV: 'production',
      ...Object.fromEntries(
        Object.entries(process.env).filter(([k]) =>
          ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY',
           'SUPABASE_SERVICE_ROLE_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY',
           'OPENAI_API_KEY','PIPELINE_SECRET','NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
           'ADMIN_SECRET','NEXT_PUBLIC_SITE_URL'].includes(k)
        )
      )
    }
  }]
};
