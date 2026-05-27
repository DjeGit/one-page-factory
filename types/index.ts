export interface PainPoint {
  emoji: string;
  title: string;
  description: string;
}

export interface Benefit {
  icon: string;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  date: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  original_price: number | null;
  affiliate_url: string;
  redirect_code: string;
  image_url: string | null;
  active: boolean;

  // AI-generated content
  hero_title: string | null;
  hero_subtitle: string | null;
  pain_points: PainPoint[];
  benefits: Benefit[];
  faq: FAQItem[];
  tiktok_script: string | null;
  testimonials: Testimonial[];

  // SEO
  meta_title: string | null;
  meta_description: string | null;

  // Design Studio
  template_id?: string | null;
  template_config?: Record<string, unknown> | null;

  // Pixels & tracking
  pixel_meta?: string;
  pixel_tiktok?: string;
  pixel_gtm?: string;

  // Multi-URL
  affiliate_url_2?: string;
  affiliate_url_3?: string;

  // Geo pricing
  geo_pricing?: Record<string, number>;

  // Email capture & UX features
  email_capture_enabled?: boolean;
  email_capture_discount?: number;
  exit_intent_enabled?: boolean;
  social_proof_enabled?: boolean;

  created_at: string;
  updated_at: string;
}


export interface ProductFormData {
  name: string;
  slug?: string;
  description: string;
  price: number | null;
  original_price: number | null;
  affiliate_url: string;
  image_url: string;
  active: boolean;
  hero_title: string;
  hero_subtitle: string;
  pain_points: PainPoint[];
  benefits: Benefit[];
  faq: FAQItem[];
  tiktok_script: string;
  testimonials: Testimonial[];
  meta_title: string;
  meta_description: string;
}

export interface Click {
  id: string;
  product_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  referer: string | null;
  clicked_at: string;
}

export interface PageView {
  id: string;
  product_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  referer: string | null;
  viewed_at: string;
}

export interface GeneratedContent {
  hero_title: string;
  hero_subtitle: string;
  pain_points: PainPoint[];
  benefits: Benefit[];
  faq: FAQItem[];
  tiktok_script: string;
  testimonials: Testimonial[];
  meta_title: string;
  meta_description: string;
}

export interface AnalyticsData {
  product_id: string;
  product_name: string;
  slug: string;
  clicks: number;
  views: number;
  ctr: number;
  epc: number;
  revenue_estimate: number;
}

export interface DashboardStats {
  total_products: number;
  active_products: number;
  clicks_today: number;
  views_today: number;
  total_clicks: number;
  total_views: number;
}

export interface ABTest {
  id: string;
  product_id: string;
  name: string;
  variant_a_title: string;
  variant_a_subtitle: string;
  variant_a_cta: string;
  variant_a_views: number;
  variant_a_clicks: number;
  variant_b_title: string;
  variant_b_subtitle: string;
  variant_b_cta: string;
  variant_b_views: number;
  variant_b_clicks: number;
  winner: 'a' | 'b' | null;
  active: boolean;
  created_at: string;
}

export interface EmailLead {
  id: string;
  product_id: string;
  email: string;
  source_slug: string;
  created_at: string;
}

export interface HealthScore {
  score: number; // 0-100
  details: {
    has_image: boolean;
    has_ai_content: boolean;
    has_price: boolean;
    has_affiliate_url: boolean;
    has_pixel: boolean;
    ctr_ok: boolean;
    has_ab_test: boolean;
    is_active: boolean;
  };
}

export interface ImportRow {
  name: string;
  affiliate_url: string;
  price?: string;
  original_price?: string;
  image_url?: string;
  description?: string;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'redirect_code'> & {
          redirect_code?: string;
        };
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
      };
      clicks: {
        Row: Click;
        Insert: Omit<Click, 'id' | 'clicked_at'>;
        Update: Partial<Omit<Click, 'id'>>;
      };
      page_views: {
        Row: PageView;
        Insert: Omit<PageView, 'id' | 'viewed_at'>;
        Update: Partial<Omit<PageView, 'id'>>;
      };
    };
  };
}
