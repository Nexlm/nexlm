import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage.jsx';

describe('NotFoundPage', () => {
  it('says the page does not exist', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('This page wandered off-chain.');
  });

  it('offers a way back to the market', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to the market' })).toHaveAttribute('href', '/');
  });
});
