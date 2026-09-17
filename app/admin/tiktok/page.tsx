import TikTokHub from "@/components/admin/TikTokHub";
import { getAllProducts } from "@/lib/supabase";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TikTokPage() {
  const market = cookies().get("opf_market")?.value ?? "fr";
  const products = await getAllProducts(market);
  return <TikTokHub products={products} />;
}
