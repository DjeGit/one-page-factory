import type { Product } from '@/types';
import type { TemplateOverrides } from '@/components/templates/TemplateRenderer';

export const MOCK_PRODUCT: Product = {
  id: 'preview',
  name: 'Votre Produit',
  slug: 'preview',
  description: 'La solution qui va transformer votre quotidien en quelques semaines.',
  price: 49,
  original_price: 97,
  affiliate_url: '#',
  redirect_code: 'preview',
  image_url: null,
  active: true,
  hero_title: 'La solution qui change tout',
  hero_subtitle: "Rejoignez 12 000 clients satisfaits et transformez votre quotidien dès aujourd'hui.",
  pain_points: [
    { emoji: '😩', title: 'Vous en avez assez', description: 'Des solutions qui promettent sans tenir leurs engagements.' },
    { emoji: '💸', title: 'Trop cher ailleurs', description: 'Les alternatives coûtent une fortune sans garantie de résultat.' },
    { emoji: '⏳', title: 'Perte de temps', description: 'Des heures investies pour zéro résultat concret.' },
  ],
  benefits: [
    { icon: '⚡', title: 'Résultats rapides', description: 'Visible dès la première semaine d\'utilisation.' },
    { icon: '🔒', title: 'Garanti 30 jours', description: 'Satisfait ou remboursé sans conditions, sans question.' },
    { icon: '🏆', title: 'N°1 du marché', description: 'Plébiscité par plus de 12 000 clients en France.' },
    { icon: '🎯', title: 'Simple à utiliser', description: 'Aucune compétence technique requise, tout est guidé.' },
  ],
  faq: [
    { question: 'Comment ça fonctionne ?', answer: 'En 3 étapes simples et guidées, vous obtenez des résultats mesurables dès la première semaine.' },
    { question: 'Y a-t-il une garantie ?', answer: 'Oui, nous offrons 30 jours satisfait ou remboursé sans aucune condition.' },
    { question: 'Quand vais-je recevoir ma commande ?', answer: 'Expédition sous 24h, livraison en 2-3 jours ouvrés partout en France.' },
    { question: 'Est-ce adapté à mon profil ?', answer: 'Oui, ce produit a été conçu pour fonctionner dans toutes les situations.' },
  ],
  tiktok_script: null,
  testimonials: [
    { name: 'Marie D.', location: 'Paris', rating: 5, text: 'Incroyable, je recommande à 100% ! Les résultats sont là dès la première semaine.', date: '2026-01-15' },
    { name: 'Thomas L.', location: 'Lyon', rating: 5, text: "Résultats au-delà de mes espérances. J'aurais dû essayer bien plus tôt !", date: '2026-02-03' },
    { name: 'Sophie R.', location: 'Bordeaux', rating: 5, text: "Le meilleur achat de l'année. Simple, efficace, je ne peux plus m'en passer.", date: '2026-03-20' },
    { name: 'Julien M.', location: 'Marseille', rating: 5, text: 'Très sceptique au départ, mais les résultats m\'ont convaincu en moins de 10 jours.', date: '2026-04-05' },
  ],
  meta_title: 'Votre Produit — La solution N°1',
  meta_description: 'Découvrez la solution qui a déjà aidé 12 000 personnes à transformer leur quotidien.',
  email_capture_enabled: false,
  exit_intent_enabled: false,
  social_proof_enabled: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_OVERRIDES: TemplateOverrides = {
  heroTitle: 'La solution qui change tout',
  heroSubtitle: "Rejoignez 12 000 clients satisfaits dès aujourd'hui.",
  ctaText: 'Je commande maintenant',
  sections: {
    painPoints: true,
    benefits: true,
    testimonials: true,
    faq: true,
    countdown: false,
    stock: false,
  },
};
