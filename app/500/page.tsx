import Link from "next/link";

export default function Vercel500Page() {
  return (
    <main className="container section">
      <div className="empty">
        <span className="badge badge-danger">SERVER ERROR</span>
        <h1>MyShop hit a server error</h1>
        <p>Reload once. If it continues, open <strong>/api/health</strong> to inspect the deployment configuration.</p>
        <div className="actions" style={{justifyContent:"center"}}>
          <Link className="btn btn-primary" href="/">Reload shop</Link>
          <Link className="btn btn-ghost" href="/api/health">Open health check</Link>
        </div>
      </div>
    </main>
  );
}
