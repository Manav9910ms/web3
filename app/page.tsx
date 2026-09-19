import { Storefront } from "../components/Storefront";
import { getCatalog } from "../lib/server-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getCatalog();
  return <Storefront products={products} />;
}
