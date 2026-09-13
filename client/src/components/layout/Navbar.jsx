import clsx from 'clsx';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useIsAdmin } from '../../store/authStore.js';
import { Avatar } from '../common/TraderBadge.jsx';

const linkClass = ({ isActive }) =>
  clsx(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className="text-lg tracking-tight">Nexlm</span>
    </Link>
  );
}

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'P2P Market', end: true },
    ...(user
      ? [
          { to: '/trades', label: 'My Trades' },
          { to: '/orders', label: 'My Orders' },
          { to: '/wallet', label: 'Wallet' },
        ]
      : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  function handleLogout() {
    logout();
    setOpen(false);
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/settings" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
                <Avatar name={user.displayName} size="sm" />
                <span className="text-sm font-medium text-slate-700">{user.displayName}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-600 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
                  Settings
                </NavLink>
                <button type="button" onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm font-medium text-rose-600">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={linkClass} onClick={() => setOpen(false)}>
                  Create account
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
