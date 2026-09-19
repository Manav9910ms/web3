import Link from "next/link";

export default function NotFound(){
  return <div className="container section"><div className="empty"><h1>Product not found</h1><p>That page does not exist or the product is no longer available.</p><Link className="btn btn-primary" href="/">Back to shop</Link></div></div>;
}
