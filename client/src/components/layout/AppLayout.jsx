import { Link, Outlet } from 'react-router-dom';
import { Toaster } from '../ui/Toaster.jsx';
import { AccountBanners } from './AccountBanners.jsx';
import { Logo, Navbar } from './Navbar.jsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <AccountBanners />
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 font-mono text-[11px] text-moss sm:flex-row sm:justify-between">
          <p>
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-mint align-middle" />
            Real app · on-chain Stellar escrow on every trade
          </p>
          <p>Nexlm never holds your Naira. Release XLM only after the money lands.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

const FACTS = [
  { value: '1', unit: 'escrow per trade', note: 'Seller key disabled on-chain' },
  { value: '₦0', unit: 'trading fees', note: 'Only 0.00001 XLM network fee' },
  { value: '~5s', unit: 'settlement', note: 'From release to wallet' },
];

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-line px-12 py-10 lg:flex">
        <Logo />
        <div>
          <p className="eyebrow">XLM ↔ NGN · peer to peer</p>
          <h2 className="mt-4 max-w-lg font-display text-6xl font-extrabold leading-[0.95] tracking-tight text-paper">
            Trade XLM for Naira. <span className="text-gold">Escrow</span> on every trade.
          </h2>
          <dl className="mt-10 grid grid-cols-3 border-t border-line">
            {FACTS.map((f) => (
              <div key={f.unit} className="border-r border-line py-5 pr-4 last:border-r-0 [&:not(:first-child)]:pl-5">
                <dt className="font-display text-4xl font-extrabold tracking-tight text-paper">{f.value}</dt>
                <dd className="mt-1 text-sm text-soft">{f.unit}</dd>
                <dd className="mt-0.5 font-mono text-[11px] text-moss">{f.note}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="font-mono text-[11px] text-moss">
          Bank transfer · OPay · PalmPay · Kuda · Moniepoint
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-paper">{title}</h1>
          {subtitle && <p className="mt-2 text-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-10 font-mono text-[11px] text-moss">
            <Link to="/" className="hover:text-paper">
              ← Back to the market
            </Link>
          </p>
        </div>
      </section>
      <Toaster />
    </div>
  );
}
