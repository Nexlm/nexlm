import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary.jsx';

const Boom = () => {
  throw new Error('Cannot read properties of undefined');
};

const renderBoundary = (children) => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const result = render(<ErrorBoundary>{children}</ErrorBoundary>);
  return { ...result, spy };
};

afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>Trade room</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Trade room')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of a blank page', () => {
    renderBoundary(<Boom />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'This screen failed to load.' })).toBeInTheDocument();
  });

  it('reassures the trader that escrow is unaffected', () => {
    renderBoundary(<Boom />);
    expect(screen.getByText(/Your XLM is unaffected/)).toBeInTheDocument();
  });

  it('shows the error message so a report can name it', () => {
    renderBoundary(<Boom />);
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
  });

  it('offers a reload and a way back to the market', () => {
    renderBoundary(<Boom />);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the market' })).toHaveAttribute('href', '/');
  });

  it('logs the failure for whoever is debugging', () => {
    const { spy } = renderBoundary(<Boom />);
    expect(spy.mock.calls.some((call) => call[0] === 'Render failed')).toBe(true);
  });
});
