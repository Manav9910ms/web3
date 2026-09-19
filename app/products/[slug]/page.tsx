import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/ProductDetail";
import { getProductBySlug, publicProduct } from "../../../lib/server-catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="product-page">
      <div className="container">
        <p><Link href="/">← Back to shop</Link></p>
        <ProductDetail product={publicProduct(product)} />
      </div>
    </div>
  );
}
