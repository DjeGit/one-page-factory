export interface TemplateConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Visual
  primaryColor: string;
  accentColor: string;
  bgFrom: string;
  bgTo: string;
  textColor: 'white' | 'dark';
  // Layout
  heroLayout: 'centered' | 'split-left' | 'split-right';
  // Sections enabled by default
  defaultSections: {
    painPoints: boolean;
    benefits: boolean;
    showcase: boolean;
    testimonials: boolean;
    faq: boolean;
    countdown: boolean;
    stock: boolean;
  };
  // Style variant
  style: 'bold' | 'minimal' | 'luxury' | 'energetic' | 'elegant';
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'dark-pro',
    name: 'Dark Pro',
    emoji: '🌑',
    description: 'Design sombre et professionnel avec des accents violets',
    primaryColor: '#7C3AED',
    accentColor: '#F59E0B',
    bgFrom: 'from-gray-950',
    bgTo: 'to-violet-950',
    textColor: 'white',
    heroLayout: 'centered',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: true,
      stock: true,
    },
    style: 'bold',
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    emoji: '⬜',
    description: 'Design épuré et minimaliste sur fond blanc',
    primaryColor: '#1F2937',
    accentColor: '#7C3AED',
    bgFrom: 'from-white',
    bgTo: 'to-gray-50',
    textColor: 'dark',
    heroLayout: 'split-right',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: false,
      stock: false,
    },
    style: 'minimal',
  },
  {
    id: 'bold-red',
    name: 'Bold Red',
    emoji: '🔥',
    description: 'Design percutant rouge et orange plein d\'énergie',
    primaryColor: '#DC2626',
    accentColor: '#F97316',
    bgFrom: 'from-red-950',
    bgTo: 'to-orange-900',
    textColor: 'white',
    heroLayout: 'centered',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: true,
      stock: true,
    },
    style: 'energetic',
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    emoji: '🌿',
    description: 'Design naturel vert émeraude apaisant',
    primaryColor: '#059669',
    accentColor: '#F59E0B',
    bgFrom: 'from-emerald-950',
    bgTo: 'to-green-900',
    textColor: 'white',
    heroLayout: 'split-left',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: false,
      stock: true,
    },
    style: 'elegant',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    emoji: '🌊',
    description: 'Design bleu océan moderne et dynamique',
    primaryColor: '#2563EB',
    accentColor: '#06B6D4',
    bgFrom: 'from-blue-950',
    bgTo: 'to-cyan-900',
    textColor: 'white',
    heroLayout: 'centered',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: true,
      stock: true,
    },
    style: 'bold',
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    emoji: '👑',
    description: 'Design luxueux doré pour produits premium',
    primaryColor: '#92400E',
    accentColor: '#D97706',
    bgFrom: 'from-stone-950',
    bgTo: 'to-amber-950',
    textColor: 'white',
    heroLayout: 'centered',
    defaultSections: {
      painPoints: false,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: false,
      stock: false,
    },
    style: 'luxury',
  },
  {
    id: 'soft-purple',
    name: 'Soft Purple',
    emoji: '💜',
    description: 'Design doux violet et rose élégant',
    primaryColor: '#7C3AED',
    accentColor: '#EC4899',
    bgFrom: 'from-purple-50',
    bgTo: 'to-pink-50',
    textColor: 'dark',
    heroLayout: 'split-right',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: false,
      stock: false,
    },
    style: 'elegant',
  },
  {
    id: 'neon-dark',
    name: 'Neon Dark',
    emoji: '⚡',
    description: 'Design sombre avec accents néons vert et cyan',
    primaryColor: '#10B981',
    accentColor: '#06B6D4',
    bgFrom: 'from-gray-950',
    bgTo: 'to-slate-900',
    textColor: 'white',
    heroLayout: 'centered',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: true,
      stock: true,
    },
    style: 'energetic',
  },
  {
    id: 'sunshine',
    name: 'Sunshine',
    emoji: '☀️',
    description: 'Design ensoleillé ambre et orange vibrant',
    primaryColor: '#D97706',
    accentColor: '#EF4444',
    bgFrom: 'from-amber-400',
    bgTo: 'to-orange-500',
    textColor: 'dark',
    heroLayout: 'split-left',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: false,
      countdown: true,
      stock: true,
    },
    style: 'bold',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    emoji: '🤍',
    description: 'Design professionnel corporate bleu et blanc',
    primaryColor: '#1E40AF',
    accentColor: '#1D4ED8',
    bgFrom: 'from-white',
    bgTo: 'to-blue-50',
    textColor: 'dark',
    heroLayout: 'split-right',
    defaultSections: {
      painPoints: true,
      benefits: true,
      showcase: true,
      testimonials: true,
      faq: true,
      countdown: false,
      stock: false,
    },
    style: 'minimal',
  },
];

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
