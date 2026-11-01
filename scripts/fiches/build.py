import glob, json, importlib.util, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else '../../supabase/seeds/20261101-fiches-tech.sql'
DATE = '2026-10-30'
MK = {'fr': ('fr', 'EUR'), 'es': ('es', 'EUR'), 'en': ('uk', 'GBP')}
def fmt(price, lang):
    if lang == 'fr': return f"{price:.2f}".replace('.', ',') + ' €'
    if lang == 'es': return f"{price:.2f}".replace('.', ',') + ' €'
    return f"£{price:.2f}"
DATES = {'fr': '30 octobre 2026', 'es': '30 de octubre de 2026', 'en': '30 October 2026'}
DELIV = {
 'fr': ('Livraison et retours : comment ça marche ?', 'Les délais, frais de livraison et conditions de retour sont indiqués sur la page de l’offre et peuvent varier : consulte-les avant de commander.'),
 'es': ('¿Cómo funcionan el envío y las devoluciones?', 'Los plazos, los gastos de envío y las condiciones de devolución figuran en la página de la oferta y pueden variar: consúltalos antes de pedir.'),
 'en': ('How do delivery and returns work?', 'Delivery times, shipping costs, import charges and return conditions are shown on the offer page and may vary: check them before ordering.')}
def priceq(lang, price):
    p, d = fmt(price, lang), DATES[lang]
    if lang == 'fr': return ('Quel est le prix ?', f"Le prix affiché ({p}) a été relevé chez le marchand le {d}. Il varie avec les offres et les coupons : confirme-le avec le revendeur avant d’acheter.")
    if lang == 'es': return ('¿Cuál es el precio?', f"El precio mostrado ({p}) se registró en la tienda el {d}. Varía con las ofertas y los cupones: confírmalo con el vendedor antes de comprar.")
    return ('How much does it cost?', f"The price shown ({p}) was recorded at the merchant on {d}. It changes with offers and coupons: confirm it with the seller before you buy.")
def q(s): return '$q$' + s + '$q$'
def j(o): return '$j$' + json.dumps(o, ensure_ascii=False) + '$j$::jsonb'
rows = []; links = []
for f in sorted(glob.glob('p[0-9]*.py')):
    spec = importlib.util.spec_from_file_location('m', f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); P = m.P
    imgs = ['https://ae-pic-a1.aliexpress-media.com/kf/' + i for i in P['images']]
    first = None; slugs = []
    for lang in ('fr', 'es', 'en'):
        T = P['L'].get(lang)
        if not T: continue
        market, cur = MK[lang]
        price = P['price'][market]
        url = f"https://www.aliexpress.com/item/{P['uk_id'] if lang == 'en' else P['fr_es_id']}.html"
        ben = [{'icon': a, 'title': b, 'description': c} for a, b, c in T['ben']]
        faq = [{'question': a, 'answer': b} for a, b in T['faq']] + [{'question': DELIV[lang][0], 'answer': DELIV[lang][1]}, {'question': priceq(lang, price)[0], 'answer': priceq(lang, price)[1]}]
        desc = T['desc']
        seller = 'NULL' if lang == 'en' else q(P['seller'])
        meta_t = f"{T['name']} | Tendpick"
        rows.append(f"""-- {T['name']} ({market})
INSERT INTO products (name, slug, description, price, original_price, price_currency, price_checked_at, free_shipping, affiliate_url, image_url, images, active,
  hero_title, hero_subtitle, pain_points, benefits, faq, testimonials, meta_title, meta_description,
  market, product_source, commission_rate, seller_name, video_url, category_id)
SELECT {q(T['name'])}, {q(T['slug'])}, {q(desc)}, {price}, NULL, '{cur}', '{DATE}', true, {q(url)}, {q(imgs[0])},
  ARRAY[{', '.join(q(i) for i in imgs)}]::text[], false,
  {q(T['hero'])}, {q(T['sub'])}, '[]'::jsonb, {j(ben)}, {j(faq)}, '[]'::jsonb, {q(meta_t)}, {q(T['sub'])},
  {q(market)}, 'manual_affiliate', {P['comm'][market]}, {seller}, NULL, (SELECT id FROM categories WHERE slug = 'tech' LIMIT 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, price_currency = EXCLUDED.price_currency,
  price_checked_at = EXCLUDED.price_checked_at, free_shipping = EXCLUDED.free_shipping, hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle, benefits = EXCLUDED.benefits, faq = EXCLUDED.faq, meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description, seller_name = EXCLUDED.seller_name, commission_rate = EXCLUDED.commission_rate, updated_at = NOW();
""")
        slugs.append(T['slug'])
    if len(slugs) > 1:
        links.append(f"UPDATE products SET source_product_ref = (SELECT id FROM products WHERE slug = {q(slugs[0])})\nWHERE slug IN ({', '.join(q(s) for s in slugs[1:])}) AND source_product_ref IS NULL;")
hdr = f"""-- Fiches Tech (9 produits) – brouillons (active = false). Générées le 01/11/2026.
-- Prérequis : migration 20261101000001_products_price_shipping.sql (+ les migrations du 30/10).
-- Les prix sont ceux relevés sur le portail le {DATE} (affichés avec astérisque et mention « à confirmer »).
-- Les liens affiliate_url sont des adresses NEUTRES d'AliExpress : remplace-les par tes liens affiliés avant d'activer.
-- Relançable : met à jour textes et prix sans toucher au lien affilié, aux photos ni à l'état actif.
"""
open(OUT, 'w', encoding='utf-8').write(hdr + '\n' + '\n'.join(rows) + '\n-- Lie les versions d\'un même produit.\n' + '\n'.join(links) + '\n')
print(len(rows), 'inserts', len(links), 'liens')
