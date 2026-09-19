import { Storefront } from "../components/Storefront";
import { getCatalog, publicProduct } from "../lib/server-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = (await getCatalog()).map(publicProduct);
  return <Storefront products={products} />;
}
