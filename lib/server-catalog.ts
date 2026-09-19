import { demoProducts } from "./demo-products";
import { getAdminDb } from "./firebase-admin";
import type { Product } from "./types";

function normalizeProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  return {
    id,
    slug: String(data.slug || id),
    name: String(data.name || "Untitled product"),
    shortDescription: String(data.shortDescription || ""),
    description: String(data.description || ""),
    price: Number(data.price || 0),
    compareAtPrice: data.compareAtPrice == null ? undefined : Number(data.compareAtPrice),
    costPrice: data.costPrice == null ? undefined : Number(data.costPrice),
    sourceType: data.sourceType === "resell" ? "resell" : "own",
    supplier: data.supplier ? String(data.supplier) : undefined,
    supplierUrl: data.supplierUrl ? String(data.supplierUrl) : undefined,
    sku: String(data.sku || id),
    category: String(data.category || "General"),
    images: Array.isArray(data.images) ? data.images.map(String) : [],
    stock: Number(data.stock || 0),
    active: Boolean(data.active),
    featured: Boolean(data.featured),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : []
  };
}

export async function getCatalog(options?: { includeInactive?: boolean }) {
  const db = getAdminDb();
  if (!db) return demoProducts;

  const snapshot = await db.collection("products").get();
  if (snapshot.empty) return demoProducts;

  const products = snapshot.docs.map((doc) => normalizeProduct(doc.id, doc.data()));
  return options?.includeInactive ? products : products.filter((product) => product.active);
}

export async function getProductBySlug(slug: string) {
  const products = await getCatalog();
  return products.find((product) => product.slug === slug) || null;
}

export function publicProduct(product: Product) {
  const { costPrice, supplier, supplierUrl, ...safe } = product;
  void costPrice;
  void supplier;
  void supplierUrl;
  return safe;
}
