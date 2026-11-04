/** Contenu d'un post social (publication immédiate ou programmée) : validation commune. */
import { isHttpUrl } from './http';

export interface SocialInput {
  channelIds: string[];
  text: string;
  imageUrls?: string[];
  videoUrl?: string;
  link?: string;
}

export function parseSocialInput(body: Record<string, unknown>): { data: SocialInput } | { error: string } {
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return { error: 'Le contenu du post est requis.' };
  if (text.length > 5000) return { error: 'Le contenu du post est trop long (5000 caractères maximum).' };

  const channelIds = Array.isArray(body.channelIds) ? body.channelIds : [];
  if (channelIds.length === 0) return { error: 'Sélectionnez au moins un canal.' };
  if (channelIds.length > 10 || channelIds.some((c) => typeof c !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(c))) {
    return { error: 'Liste de canaux invalide.' };
  }

  let imageUrls: string[] | undefined;
  if (body.imageUrls !== undefined && body.imageUrls !== null) {
    if (!Array.isArray(body.imageUrls) || body.imageUrls.length > 10 || !body.imageUrls.every(isHttpUrl)) {
      return { error: 'Les images doivent être des adresses http(s) valides (10 maximum).' };
    }
    imageUrls = body.imageUrls as string[];
  }
  const videoUrl = typeof body.videoUrl === 'string' && body.videoUrl ? body.videoUrl.trim() : undefined;
  if (videoUrl && !isHttpUrl(videoUrl)) return { error: 'Adresse de vidéo invalide.' };
  const link = typeof body.link === 'string' && body.link ? body.link.trim() : undefined;
  if (link && !isHttpUrl(link)) return { error: 'Adresse du lien invalide.' };

  return { data: { channelIds: channelIds as string[], text, imageUrls, videoUrl, link } };
}
