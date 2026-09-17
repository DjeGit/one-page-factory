import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/supabase";
import { DEFAULT_MARKET, isValidMarket } from "@/lib/market";

export const dynamic = "force-dynamic";

// Devise forcée EUR sur les 3 marchés pour le moment (décision Jerome —
// 'uk' = marché anglophone au sens langue, pas Royaume-Uni au sens devise/pays).
const MKTS: Record<string, { domain: string; currency: string; name: string }> = {
  fr: { domain: "tendpick.fr",  currency: "EUR", name: "Tendpick France" },
  es: { domain: "tendpick.es",  currency: "EUR", name: "Tendpick Espana" },
  uk: { domain: "tendpick.com", currency: "EUR", name: "Tendpick Anglophone" },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const mktParam = new URL(req.url).searchParams.get("market");
  const mkt = isValidMarket(mktParam) ? mktParam : DEFAULT_MARKET;
  const cfg = MKTS[mkt] ?? MKTS.fr;
  const all = await getAllProducts(mkt);
  const products = all.filter(p => (p as unknown as Record<string, unknown>).active !== false);

  const items = products.map(p => {
    const price = typeof (p as unknown as Record<string, unknown>).price === "number"
      ? ((p as unknown as Record<string, unknown>).price as number).toFixed(2)
      : String((p as unknown as Record<string, unknown>).price ?? "0");
    const img = (p as unknown as Record<string, unknown>).image_url as string | undefined;
    return [
      "    <item>",
      "      <g:id>" + esc(p.id) + "</g:id>",
      "      <g:title>" + esc(p.name) + "</g:title>",
      "      <g:description>" + esc((p.description ?? "").slice(0, 5000)) + "</g:description>",
      "      <g:link>https://" + cfg.domain + "/" + esc(p.slug ?? p.id) + "</g:link>",
      img ? "      <g:image_link>" + esc(img) + "</g:image_link>" : null,
      "      <g:price>" + price + " " + cfg.currency + "</g:price>",
      "      <g:availability>in stock</g:availability>",
      "      <g:condition>new</g:condition>",
      "      <g:brand>Tendpick</g:brand>",
      "    </item>",
    ].filter(Boolean).join("\n");
  }).join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>" + cfg.name + "</title>",
    "    <link>https://" + cfg.domain + "</link>",
    "    <description>Produits tendance " + cfg.name + "</description>",
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
