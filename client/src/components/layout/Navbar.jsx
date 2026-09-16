import clsx from 'clsx';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useIsAdmin } from '../../store/authStore.js';
import { Avatar } from '../common/TraderBadge.jsx';
import { ConnectionStatus } from './ConnectionStatus.jsx';

const linkClass = ({ isActive }) =>
  clsx(
    'relative px-3 py-5 text-sm font-medium transition-colors',
    isActive
      ? 'text-paper after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-gold'
      : 'text-moss hover:text-paper',
  );

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-leaf font-display text-sm font-extrabold text-ink">N</span>
      <span className="font-display text-xl font-bold tracking-tight text-paper">Nexlm</span>
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
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="mr-2 hidden items-center gap-3 lg:flex">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-moss">Stellar testnet</span>
            {user && <ConnectionStatus />}
          </span>
          {user ? (
            <>
              <Link to="/settings" className="flex items-center gap-2 rounded px-2 py-1 hover:bg-panel">
                <Avatar name={user.displayName} size="sm" />
                <span className="text-sm font-medium text-paper">{user.displayName}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded p-2 text-moss hover:bg-panel hover:text-paper"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 text-sm font-medium text-soft hover:text-paper">
                Log in
              </Link>
              <Link to="/register" className="rounded bg-leaf px-4 py-2 text-sm font-semibold text-ink hover:bg-mint">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded p-2 text-soft md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-ink px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => clsx('border-b border-line py-3 text-sm font-medium', isActive ? 'text-gold' : 'text-soft')}
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/settings" onClick={() => setOpen(false)} className="border-b border-line py-3 text-sm font-medium text-soft">
                  Settings
                </NavLink>
                <button type="button" onClick={handleLogout} className="py-3 text-left text-sm font-medium text-ember">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)} className="border-b border-line py-3 text-sm font-medium text-soft">
                  Log in
                </NavLink>
                <NavLink to="/register" onClick={() => setOpen(false)} className="py-3 text-sm font-medium text-mint">
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
