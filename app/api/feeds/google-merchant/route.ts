import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MKTS: Record<string, { domain: string; currency: string; name: string }> = {
  fr:  { domain: "tendpick.fr",  currency: "EUR", name: "Tendpick France" },
  es:  { domain: "tendpick.es",  currency: "EUR", name: "Tendpick Espana" },
  com: { domain: "tendpick.com", currency: "GBP", name: "Tendpick International" },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const mkt = new URL(req.url).searchParams.get("market") ?? "fr";
  const cfg = MKTS[mkt] ?? MKTS.fr;
  const all = await getAllProducts(mkt);
  const products = all.filter(p => (p as Record<string, unknown>).active !== false);

  const items = products.map(p => {
    const price = typeof (p as Record<string, unknown>).price === "number"
      ? ((p as Record<string, unknown>).price as number).toFixed(2)
      : String((p as Record<string, unknown>).price ?? "0");
    const img = (p as Record<string, unknown>).image_url as string | undefined;
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
