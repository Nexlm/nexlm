import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <div className="py-24">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 max-w-2xl font-display text-6xl font-extrabold leading-[0.95] tracking-tight">
        This page wandered <span className="text-gold">off-chain</span>.
      </h1>
      <p className="mt-4 text-soft">The link may be broken or the page may have moved.</p>
      <Link to="/" className="mt-8 inline-flex rounded bg-leaf px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mint">
        Back to the market
      </Link>
    </div>
  );
}
