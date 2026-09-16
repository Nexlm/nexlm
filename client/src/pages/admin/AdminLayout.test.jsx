import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AdminLayout from './AdminLayout.jsx';

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>Overview page</p>} />
          <Route path="users" element={<p>Users page</p>} />
          <Route path="trades" element={<p>Trades page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('AdminLayout', () => {
  it('frames the admin area and renders the current section', () => {
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByText('Overview page')).toBeInTheDocument();
  });

  it('links to every admin section', () => {
    renderAt('/admin');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: 'Trades' })).toHaveAttribute('href', '/admin/trades');
  });

  it('marks the section you are in', () => {
    renderAt('/admin/users');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('keeps Overview inactive on nested routes', () => {
    renderAt('/admin/trades');
    expect(screen.getByText('Trades page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });
});
