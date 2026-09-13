import { Outlet } from 'react-router-dom';
import { Toaster } from '../ui/Toaster.jsx';
import { AccountBanners } from './AccountBanners.jsx';
import { Navbar } from './Navbar.jsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <AccountBanners />
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Nexlm. P2P XLM ↔ NGN with on-chain Stellar escrow.</p>
          <p>Nexlm never holds your Naira. Only release XLM after the money is in your account.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="Nexlm" className="mx-auto h-11 w-11" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
      <Toaster />
    </div>
  );
}
