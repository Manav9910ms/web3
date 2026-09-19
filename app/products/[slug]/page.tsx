import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/ProductDetail";
import { demoProducts } from "../../../lib/demo-products";

export const dynamic = "force-static";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = demoProducts.find((item) => item.slug === slug);

  if (!product) notFound();

  return (
    <div className="product-page">
      <div className="container">
        <p><Link href="/">← Back to shop</Link></p>
        <ProductDetail product={product} />
      </div>
    </div>
  );
}
