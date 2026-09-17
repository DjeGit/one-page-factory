import { createHash } from 'crypto';

export function hashAdminToken(secret: string): string {
  const salt = process.env.ADMIN_SALT || 'tendpick-admin-salt';
  return createHash('sha256').update(secret + salt).digest('hex');
}
