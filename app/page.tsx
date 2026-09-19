import { Storefront } from "../components/Storefront";
import { demoProducts } from "../lib/demo-products";

export const dynamic = "force-static";

export default function HomePage() {
  return <Storefront products={demoProducts} />;
}
