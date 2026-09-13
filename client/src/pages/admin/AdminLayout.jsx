import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/trades', label: 'Trades' },
];

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">Admin</h1>
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  'rounded-md px-4 py-1.5 text-sm font-medium',
                  isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
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
