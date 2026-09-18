'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/types';

interface Props { products: Product[]; }
type Tab = 'scripts' | 'merchant' | 'bio' | 'hashtags';

const MKT_DOMAINS: Record<string,string> = { fr:'tendpick.fr', es:'tendpick.es', uk:'tendpick.com' };

const CATS = [
  { id:'tech',      label:'Tech',      tags:['#gadget','#techfr','#bonplan','#techtok','#amazon','#musthave','#techlife','#innovation','#smartphone','#unboxing','#review','#testproduit'] },
  { id:'mode',      label:'Mode',      tags:['#modefr','#tenuedujour','#outfit','#style','#shopping','#fashionfr','#tendance','#lookbook','#ootd','#vetements','#fashionista','#streetstyle'] },
  { id:'lifestyle', label:'Lifestyle', tags:['#lifestyle','#homedesign','#decomaison','#fyp','#viral','#tiktokfrance','#maison','#interieur','#organisation','#productivite','#routine'] },
  { id:'sport',     label:'Sport',     tags:['#sport','#fitness','#motivation','#workout','#musculation','#running','#entrainement','#gym','#yoga','#nutrition','#performance','#sante'] },
  { id:'art',       label:'Art',       tags:['#art','#artisanat','#diy','#creation','#handmade','#artiste','#craft','#peinture','#dessin','#creative','#illustration','#makerlife'] },
];

export default function TikTokHub({ products }: Props) {
  const [tab, setTab] = useState<Tab>('scripts');
  const [prodId, setProdId] = useState(products[0]?.id || '');
  const [cat, setCat] = useState('tech');
  const [copied, setCopied] = useState<string|null>(null);
  const [regen, setRegen] = useState(false);
  const [regenErr, setRegenErr] = useState<string|null>(null);
  const router = useRouter();

  const [bios, setBios] = useState<Record<string,boolean>>(
    Object.fromEntries(products.map(p=>[p.id, p.active]))
  );
  const [savingBio, setSavingBio] = useState<string|null>(null);

  const prod = products.find(p=>p.id===prodId);
  const activeCat = CATS.find(c=>c.id===cat);

  const copy = async (text:string, key:string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),2000); } catch{}
  };

  const handleRegen = async () => {
    if(!prod) return;
    setRegen(true); setRegenErr(null);
    try {
      const r = await fetch('/api/generate',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:prod.name, description:prod.description, price:prod.price }) });
      if(!r.ok) throw new Error('Erreur generation');
      const d = await r.json();
      if(d.tiktok_script) {
        const s = await fetch('/api/products/'+prod.id,{ method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tiktok_script:d.tiktok_script }) });
        if(!s.ok) throw new Error('Erreur sauvegarde');
        router.refresh();
      }
    } catch(e){ setRegenErr(e instanceof Error ? e.message : 'Erreur'); }
    finally{ setRegen(false); }
  };

  const handleBio = async (id:string) => {
    const v = !bios[id];
    setBios(p=>({...p,[id]:v})); setSavingBio(id);
    try { await fetch('/api/products/'+id,{ method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ active:v }) }); }
    catch { setBios(p=>({...p,[id]:!v})); }
    finally { setSavingBio(null); }
  };

  const parseScript = (s:string) => {
    const w=s.split(' '), he=Math.min(Math.ceil(w.length*.2),20), cs=Math.max(Math.floor(w.length*.85),w.length-15);
    return { hook:w.slice(0,he).join(' '), body:w.slice(he,cs).join(' '), cta:w.slice(cs).join(' ') };
  };
  const wc = (t:string)=>t.split(/\s+/).filter(Boolean).length;
  const dur = (t:string)=>{ const s=Math.round((wc(t)/150)*60); return s<60?s+'s':Math.floor(s/60)+'m'+(s%60)+'s'; };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL||'https://votre-site.com';
  const TABS: {id:Tab;label:string}[] = [
    {id:'scripts',  label:'📝 Scripts TikTok'},
    {id:'merchant', label:'🛍️ Google Merchant'},
    {id:'bio',      label:'🔗 Lien en Bio'},
    {id:'hashtags', label:'# Hashtags'},
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Hub Diffusion</h1>
          <p className="text-gray-500 mt-1">Scripts, flux produit et lien en bio — pour la publication réelle multi-canal, voir Réseaux sociaux.</p>
        </div>
        <Link href="/admin/social" className="text-sm text-primary-600 font-semibold hover:underline whitespace-nowrap">
          Réseaux sociaux (publier) →
        </Link>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={'px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all -mb-px whitespace-nowrap '+(tab===t.id?'bg-white border border-b-white border-gray-200 text-violet-700':'text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SCRIPTS TIKTOK ── */}
      {tab==='scripts' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <select value={prodId} onChange={e=>setProdId(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900">
              <option value="">Selectionner un produit...</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {prod?.tiktok_script ? (
            <>
              <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold">Script TikTok — {prod.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400"><span>{wc(prod.tiktok_script)} mots</span><span>·</span><span>~{dur(prod.tiktok_script)}</span></div>
                </div>
                {(()=>{
                  const p=parseScript(prod.tiktok_script);
                  return (
                    <div className="space-y-3 text-sm leading-relaxed">
                      {p.hook&&<div><span className="text-xs font-semibold text-orange-400 uppercase tracking-wider block mb-1">Hook — 3 premieres secondes</span><p className="text-orange-300">{p.hook}</p></div>}
                      {p.body&&<div><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Contenu principal</span><p className="text-white">{p.body}</p></div>}
                      {p.cta&&<div><span className="text-xs font-semibold text-green-400 uppercase tracking-wider block mb-1">Appel a action</span><p className="text-green-300">{p.cta}</p></div>}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>copy(prod.tiktok_script||'','script')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors">
                  {copied==='script'?'Copie !':'Copier le script'}
                </button>
                <button onClick={handleRegen} disabled={regen} className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {regen?'Generation...':'Regenerer'}
                </button>
                {regenErr&&<p className="text-sm text-red-600">{regenErr}</p>}
              </div>
            </>
          ) : prod ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-500 mb-4">Aucun script TikTok pour ce produit</p>
              <button onClick={handleRegen} disabled={regen} className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {regen?'Generation...':'Generer avec IA'}
              </button>
              {regenErr&&<p className="text-sm text-red-600 mt-2">{regenErr}</p>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
              <p className="text-gray-400">Selectionnez un produit pour afficher son script</p>
            </div>
          )}
        </div>
      )}

      {/* ── GOOGLE MERCHANT ── */}
      {tab==='merchant' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🛍️</div>
              <div>
                <h3 className="font-bold text-gray-900">Flux produit Google Merchant Center</h3>
                <p className="text-sm text-gray-500">Genere automatiquement depuis vos produits actifs</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(MKT_DOMAINS).map(([mkt,domain])=>{
                const path='/api/feeds/google-merchant?market='+mkt;
                const full='https://one-page-factory.com'+path;
                return (
                  <div key={mkt} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900">
                        {mkt==='fr'?'🇫🇷 France':mkt==='es'?'🇪🇸 Espagne':'🇬🇧 Anglophone'}{' — '}{domain}
                      </span>
                      <div className="flex items-center gap-3">
                        <a href={path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Voir →</a>
                        <button onClick={()=>copy(full,'feed-'+mkt)} className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                          {copied==='feed-'+mkt?'Copie !':'Copier URL'}
                        </button>
                      </div>
                    </div>
                    <code className="text-xs text-gray-500 block truncate">{full}</code>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Guide de configuration GMC</h3>
            <div className="space-y-4">
              {[
                {n:1,t:'Creer un compte Google Merchant Center',d:'Gratuit sur merchants.google.com. Liez votre compte Google Ads si vous en avez un.',l:'https://merchants.google.com'},
                {n:2,t:'Verifier votre domaine',d:'Ajoutez un meta tag ou fichier HTML sur tendpick.fr, tendpick.es et tendpick.com',l:null},
                {n:3,t:'Ajouter le flux produit',d:'Type : RSS 2.0. URL : le lien copie ci-dessus. Frequence recommandee : quotidienne.',l:null},
                {n:4,t:'Soumettre pour validation',d:'Delai : 2 a 5 jours. Vos produits apparaissent ensuite dans Google Shopping gratuit.',l:null},
              ].map(s=>(
                <div key={s.n} className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">{s.n}</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{s.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.d}</p>
                    {s.l&&<a href={s.l} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium mt-1 block">{s.l} →</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            <strong>Free Shopping Listings :</strong> Depuis 2020, Google propose des listes produit gratuites dans Google Shopping. Votre flux suffit pour commencer sans budget pub.
          </div>
        </div>
      )}

      {/* ── LIEN EN BIO ── */}
      {tab==='bio' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Page Lien en Bio</h3>
                <p className="text-sm text-gray-500 mt-0.5">Regroupez tous vos produits actifs en une seule page</p>
              </div>
              <a href={siteUrl+'/bio'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Voir la page
              </a>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <code className="text-sm text-violet-700 font-mono">{siteUrl}/bio</code>
              <button onClick={()=>copy(siteUrl+'/bio','bio')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                {copied==='bio'?'Copie !':'Copier le lien'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Produits a inclure</h3>
              <p className="text-xs text-gray-400 mt-0.5">Les produits actifs apparaissent sur votre page /bio</p>
            </div>
            <div className="divide-y divide-gray-100">
              {products.map(p=>(
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div><p className="font-medium text-gray-900">{p.name}</p><p className="text-sm text-gray-400">/{p.slug}</p></div>
                  <div className="flex items-center gap-3">
                    {savingBio===p.id&&<span className="text-xs text-gray-400">Sauvegarde...</span>}
                    <button type="button" onClick={()=>handleBio(p.id)} disabled={savingBio===p.id}
                      className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50 '+(bios[p.id]?'bg-green-500':'bg-gray-300')}>
                      <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 '+(bios[p.id]?'translate-x-6':'translate-x-1')}/>
                    </button>
                  </div>
                </div>
              ))}
              {products.length===0&&<div className="px-6 py-8 text-center text-gray-400">Aucun produit disponible</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── HASHTAGS ── */}
      {tab==='hashtags' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <strong>Note :</strong> Utilisez 3 a 5 hashtags pertinents par video pour maximiser la portee
          </div>
          <div className="flex flex-wrap gap-2">
            {CATS.map(c=>(
              <button key={c.id} onClick={()=>setCat(c.id)}
                className={'px-4 py-2 rounded-xl font-semibold text-sm transition-all '+(cat===c.id?'bg-violet-600 text-white shadow-sm':'bg-white border border-gray-300 text-gray-700 hover:border-violet-400')}>
                {c.label}
              </button>
            ))}
          </div>
          {activeCat&&(
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Hashtags — {activeCat.label}</h3>
                <button onClick={()=>copy(activeCat.tags.join(' '),'htags')} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors">
                  {copied==='htags'?'Copie !':'Copier tous'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeCat.tags.map(tag=>(
                  <button key={tag} onClick={()=>copy(tag,tag)}
                    className={'px-3 py-1.5 rounded-full text-sm font-medium transition-all '+(copied===tag?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700 hover:bg-violet-100 hover:text-violet-700')}>
                    {copied===tag?'✓ ':''}{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
