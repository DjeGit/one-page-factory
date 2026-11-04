import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_MARKET, isValidMarket } from "@/lib/market";
import { getProductGallery } from "@/lib/product-images";
import { getCloudinaryUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// Devise forcée EUR sur les 3 marchés pour le moment (décision Jerome —
// 'uk' = marché anglophone au sens langue, pas Royaume-Uni au sens devise/pays).
const MKTS: Record<string, { domain: string; currency: string; name: string }> = {
  fr: { domain: "tendpick.fr",  currency: "EUR", name: "Tendpick France" },
  es: { domain: "tendpick.es",  currency: "EUR", name: "Tendpick Espana" },
  uk: { domain: "tendpick.com", currency: "EUR", name: "Tendpick Anglophone" },
};

// Caractères interdits en XML 1.0 (contrôles) retirés, puis échappement des 5 entités.
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
function esc(s: string) {
  return s.replace(XML_INVALID, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Adresse absolue de la photo (le flux Google exige une URL complète, pas un identifiant Cloudinary). */
function absoluteImage(src: string | undefined): string | null {
  if (!src) return null;
  const url = /^https?:\/\//i.test(src) ? src : getCloudinaryUrl(src, { width: 1200, height: 1200 });
  return /^https?:\/\//i.test(url) ? url : null;
}

export async function GET(req: Request) {
  const mktParam = new URL(req.url).searchParams.get("market");
  const mkt = isValidMarket(mktParam) ? mktParam : DEFAULT_MARKET;
  const cfg = MKTS[mkt] ?? MKTS.fr;

  // Uniquement les fiches EN LIGNE de ce marché et les colonnes utiles (avant : toute la table, filtrée en mémoire).
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("id, name, slug, description, price, image_url, images")
    .eq("market", mkt)
    .eq("active", true)
    .order("created_at", { ascending: false });

  // Une panne de base ne doit pas produire un flux VIDE en 200 : Google Merchant
  // y verrait la disparition de tous les produits et les retirerait du catalogue.
  if (error || !data) {
    console.error("[api] GET /api/feeds/google-merchant :", error?.message);
    return NextResponse.json({ error: "Flux momentanément indisponible" }, { status: 503, headers: { "Retry-After": "300" } });
  }

  const items = data.map(p => {
    const priceNum = typeof p.price === "number" ? p.price : Number(p.price);
    // Google refuse un article sans prix ou sans photo : on ne les met pas dans le flux.
    if (!Number.isFinite(priceNum) || priceNum <= 0) return null;
    const img = absoluteImage(getProductGallery(p as { images?: string[]; image_url: string | null })[0]);
    if (!img) return null;
    return [
      "    <item>",
      "      <g:id>" + esc(p.id) + "</g:id>",
      "      <g:title>" + esc((p.name ?? "").slice(0, 150)) + "</g:title>",
      "      <g:description>" + esc((p.description ?? p.name ?? "").slice(0, 5000)) + "</g:description>",
      "      <g:link>https://" + cfg.domain + "/" + encodeURIComponent(p.slug ?? p.id) + "</g:link>",
      "      <g:image_link>" + esc(img) + "</g:image_link>",
      "      <g:price>" + priceNum.toFixed(2) + " " + cfg.currency + "</g:price>",
      "      <g:availability>in stock</g:availability>",
      "      <g:condition>new</g:condition>",
      // Audit E5 : Tendpick n'est pas la marque du produit. La marque réelle
      // n'est pas stockée ; on déclare donc l'absence d'identifiant plutôt
      // qu'une marque fausse (Google Merchant accepte identifier_exists=no).
      "      <g:identifier_exists>no</g:identifier_exists>",
      "    </item>",
    ].join("\n");
  }).filter((x): x is string => x !== null).join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>" + esc(cfg.name) + "</title>",
    "    <link>https://" + cfg.domain + "</link>",
    "    <description>Produits tendance " + esc(cfg.name) + "</description>",
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
