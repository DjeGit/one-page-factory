'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';

interface TikTokHubProps {
  products: Product[];
}

type TabType = 'scripts' | 'bio' | 'hashtags' | 'stats';

const CATEGORIES = [
  {
    id: 'tech',
    label: 'Tech',
    hashtags: ['#gadget', '#techfr', '#bonplan', '#techtok', '#nouveauté', '#amazon', '#aliexpress', '#gadgetfr', '#musthave', '#techlife', '#innovation', '#highttech', '#smartphone', '#unboxing', '#review', '#testproduit', '#techlovers', '#dealtech', '#promotech', '#accessoire'],
  },
  {
    id: 'mode',
    label: 'Mode',
    hashtags: ['#modefr', '#tenuedujour', '#outfit', '#style', '#shopping', '#fashionfr', '#tendance', '#lookbook', '#ootd', '#vetements', '#fashionista', '#streetstyle', '#capsulewardrobe', '#modedurable', '#vintage', '#shoppinghaul', '#aesthetic', '#tenue', '#look', '#outfitinspo'],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    hashtags: ['#lifestyle', '#homedesign', '#decomaison', '#homesweethome', '#fyp', '#viral', '#tiktokfrance', '#quotidien', '#vieequilibree', '#wellbeing', '#maison', '#interieur', '#organisation', '#productivite', '#developpementpersonnel', '#bonheur', '#routine', '#inspiration', '#minimalisme', '#confort'],
  },
  {
    id: 'sport',
    label: 'Sport',
    hashtags: ['#sport', '#fitness', '#motivation', '#workout', '#musculation', '#running', '#wellbeing', '#entrainement', '#sportfr', '#athlete', '#gym', '#yoga', '#nutrition', '#performance', '#defi', '#sante', '#corps', '#crossfit', '#cardio', '#coaching'],
  },
  {
    id: 'art',
    label: 'Art',
    hashtags: ['#art', '#artisanat', '#diy', '#creation', '#handmade', '#artiste', '#craft', '#peinture', '#dessin', '#creative', '#illustration', '#artistefr', '#makerlife', '#artfrancais', '#atelierart', '#creations', '#artisanatfr', '#decormaison', '#upcycling', '#orignal'],
  },
];

export default function TikTokHub({ products }: TikTokHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scripts');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState('tech');
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const router = useRouter();
  const [bioToggles, setBioToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(products.map(p => [p.id, p.active]))
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const category = CATEGORIES.find(c => c.id === selectedCategory);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // silently fail
    }
  };

  const handleRegenerate = async () => {
    if (!selectedProduct) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedProduct.name,
          description: selectedProduct.description,
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération');
      const data = await res.json();
      if (data.tiktok_script) {
        // Save the regenerated script to the product
        const saveRes = await fetch(`/api/products/${selectedProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tiktok_script: data.tiktok_script }),
        });
        if (!saveRes.ok) throw new Error('Erreur lors de la sauvegarde');
        router.refresh();
      }
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setRegenerating(false);
    }
  };

  const parseScript = (script: string) => {
    const words = script.split(' ');
    const hookEnd = Math.min(Math.ceil(words.length * 0.2), 20);
    const ctaStart = Math.max(Math.floor(words.length * 0.85), words.length - 15);
    return {
      hook: words.slice(0, hookEnd).join(' '),
      body: words.slice(hookEnd, ctaStart).join(' '),
      cta: words.slice(ctaStart).join(' '),
    };
  };

  const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = (text: string) => {
    const wc = wordCount(text);
    const seconds = Math.round((wc / 150) * 60);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://votre-site.com';

  const tabs = [
    { id: 'scripts' as TabType, label: 'Scripts TikTok' },
    { id: 'bio' as TabType, label: 'Lien en Bio' },
    { id: 'hashtags' as TabType, label: 'Hashtags & Tendances' },
    { id: 'stats' as TabType, label: 'Bonnes pratiques' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">TikTok Hub</h1>
        <p className="text-gray-500 mt-1">Créez et gérez votre contenu TikTok</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-gray-200 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Scripts */}
      {activeTab === 'scripts' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
            >
              <option value="">Sélectionner un produit...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProduct?.tiktok_script ? (
            <>
              <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold">Script TikTok — {selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{wordCount(selectedProduct.tiktok_script)} mots</span>
                    <span>·</span>
                    <span>~{estimatedDuration(selectedProduct.tiktok_script)}</span>
                  </div>
                </div>

                {(() => {
                  const parts = parseScript(selectedProduct.tiktok_script);
                  return (
                    <div className="space-y-3 text-sm leading-relaxed">
                      {parts.hook && (
                        <div>
                          <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider block mb-1">Hook (3 premières secondes)</span>
                          <p className="text-orange-300">{parts.hook}</p>
                        </div>
                      )}
                      {parts.body && (
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Contenu principal</span>
                          <p className="text-white">{parts.body}</p>
                        </div>
                      )}
                      {parts.cta && (
                        <div>
                          <span className="text-xs font-semibold text-green-400 uppercase tracking-wider block mb-1">Appel à l&apos;action</span>
                          <p className="text-green-300">{parts.cta}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(selectedProduct.tiktok_script || '', 'script')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
                >
                  {copied === 'script' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copié !
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copier le script
                    </>
                  )}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {regenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Génération...
                    </>
                  ) : 'Regénérer'}
                </button>
                {regenError && (
                  <p className="text-sm text-red-600">{regenError}</p>
                )}
              </div>
            </>
          ) : selectedProduct ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-500 mb-2">Aucun script TikTok pour ce produit</p>
              <p className="text-sm text-gray-400">Générez du contenu IA depuis la fiche produit</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
              <p className="text-gray-400">Sélectionnez un produit pour afficher son script</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bio link */}
      {activeTab === 'bio' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Page Lien en Bio</h3>
                <p className="text-sm text-gray-500 mt-0.5">Regroupez tous vos produits actifs en une seule page</p>
              </div>
              <a
                href={`${siteUrl}/bio`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Voir la page
              </a>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <code className="text-sm text-primary-700 font-mono">{siteUrl}/bio</code>
              <button
                onClick={() => copyToClipboard(`${siteUrl}/bio`, 'bio')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {copied === 'bio' ? 'Copié !' : 'Copier le lien'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Produits à inclure</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {products.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-400">/{p.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBioToggles(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      bioToggles[p.id] ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        bioToggles[p.id] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
              {products.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400">
                  Aucun produit disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Hashtags */}
      {activeTab === 'hashtags' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <strong>Note :</strong> Utilisez 3-5 hashtags pertinents par vidéo pour maximiser la portée
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-primary-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {category && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Hashtags — {category.label}</h3>
                <button
                  onClick={() => copyToClipboard(category.hashtags.join(' '), 'hashtags')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {copied === 'hashtags' ? '✓ Copié !' : 'Copier tous les hashtags'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.hashtags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => copyToClipboard(tag, tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      copied === tag
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                    }`}
                  >
                    {copied === tag ? '✓ ' : ''}{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Bonnes pratiques */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="https://business.tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-gray-900 hover:bg-gray-800 rounded-2xl transition-colors"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎵</div>
              <div>
                <p className="font-bold text-white text-sm">TikTok Business Center</p>
                <p className="text-gray-400 text-xs mt-0.5">Vos statistiques officielles</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🔥</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Creative Center</p>
                <p className="text-gray-500 text-xs mt-0.5">Tendances & inspirations</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Best practices */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">✅ Checklist vidéo gagnante</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { tip: 'Hook percutant en 0–3 secondes', detail: 'Commencez par une question, un chiffre choc ou une action surprenante.', emoji: '⚡' },
                { tip: 'Durée idéale : 15–30 secondes', detail: 'Les vidéos courtes obtiennent plus de replays et un meilleur reach.', emoji: '⏱️' },
                { tip: 'Postez entre 18h et 21h', detail: 'Meilleure fenêtre d\'engagement en France métropolitaine.', emoji: '🕐' },
                { tip: '3 à 5 hashtags ciblés', detail: 'Préférez des hashtags de niche à des hashtags génériques saturés.', emoji: '#️⃣' },
                { tip: 'Texte à l\'écran + sous-titres', detail: '+40% d\'engagement sur les vidéos avec texte lisible.', emoji: '💬' },
                { tip: 'CTA oral et visuel en fin de vidéo', detail: 'Dites "lien en bio" ET montrez-le avec un doigt pointé vers le haut.', emoji: '👆' },
                { tip: 'Utilisez une musique tendance', detail: 'Les sons viraux boostent l\'algorithme. Choisissez dans les trending sounds.', emoji: '🎵' },
                { tip: 'Postez 1 à 3 fois par jour', detail: 'La régularité est le facteur n°1 de croissance sur TikTok.', emoji: '📅' },
              ].map((item) => (
                <div key={item.tip} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.tip}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content frameworks */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">🎬 Formats vidéo qui convertissent</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { format: 'Problème → Solution', desc: 'Montrez le problème en 5s, puis votre produit comme solution.', badge: 'Très efficace' },
                { format: 'Avant / Après', desc: 'Transformation visuelle rapide. Fonctionne pour tous les niches.', badge: 'Viral' },
                { format: 'Unboxing réaction', desc: 'Découverte sincère du produit. Renforce la confiance.', badge: 'Authentique' },
              ].map((f) => (
                <div key={f.format} className="bg-white rounded-xl border border-gray-200 p-4">
                  <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-2">{f.badge}</span>
                  <p className="font-bold text-gray-900 text-sm">{f.format}</p>
                  <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
