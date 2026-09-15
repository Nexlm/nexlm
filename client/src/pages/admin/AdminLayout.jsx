import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/trades', label: 'Trades' },
];

export default function AdminLayout() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <div className="pb-5">
          <p className="eyebrow">Operations</p>
          <h1 className="page-title mt-3">Admin</h1>
        </div>
        <nav className="flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  'relative px-4 pb-4 text-sm font-semibold transition-colors',
                  isActive ? 'text-paper after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-gold' : 'text-moss hover:text-paper',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
