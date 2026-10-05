import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isAuthorizedRequest } from '@/lib/admin-auth';

/**
 * Upload direct d'image produit vers Cloudinary (05/10, demande Jerome :
 * "je dois pouvoir ajouter des images par produits ... sans devoir passer
 * par un logiciel tiers"). Avant cette route, le champ Image du formulaire
 * produit n'acceptait qu'une URL déjà hébergée ailleurs.
 *
 * Deux choses sont normalisées automatiquement à l'upload, sans action de
 * Jerome :
 * - Format/qualité : déjà fait à l'AFFICHAGE par lib/cloudinary.ts
 *   (f_auto/q_auto sur chaque <Image>) — pas dupliqué ici.
 * - Dimensions : recadrage carré 1200x1200 (c_fill, g_auto = cadrage
 *   intelligent sur le sujet principal) appliqué à l'upload, pour que
 *   toutes les images produit aient le même format quel que soit le
 *   fichier d'origine envoyé.
 *
 * Upload SIGNÉ (jamais de preset "unsigned" exposé publiquement) : la
 * signature est calculée côté serveur avec CLOUDINARY_API_SECRET, jamais
 * transmise au client.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Upload d'image non configuré : CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET manquants sur le serveur." },
      { status: 500 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image trop lourde (10 Mo max)' }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'products';
    const transformation = 'c_fill,w_1200,h_1200,g_auto';

    // Signature Cloudinary : sha1 des paramètres (hors file/api_key/signature),
    // triés par clé, concaténés "k=v&k2=v2", suivis du secret.
    // https://cloudinary.com/documentation/signatures
    const toSign = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('api_key', apiKey);
    uploadForm.append('timestamp', String(timestamp));
    uploadForm.append('signature', signature);
    uploadForm.append('folder', folder);
    uploadForm.append('transformation', transformation);

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: uploadForm,
    });

    const data = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      console.error('Cloudinary upload error:', data);
      return NextResponse.json({ error: data?.error?.message || "Échec de l'upload vers Cloudinary" }, { status: 502 });
    }

    // public_id suffit pour lib/cloudinary.ts (getCloudinaryUrl ré-applique
    // f_auto/q_auto + le recadrage voulu à chaque affichage) — on renvoie
    // aussi secure_url au cas où un usage futur en a besoin tel quel.
    return NextResponse.json({ public_id: data.public_id, url: data.secure_url });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
