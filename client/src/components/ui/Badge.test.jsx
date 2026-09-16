import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TRADE_STATUS } from '../../lib/constants.js';
import { Badge, StatusBadge } from './Badge.jsx';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>Escrow locked</Badge>);
    expect(screen.getByText('Escrow locked')).toBeInTheDocument();
  });

  it('applies the tone colours', () => {
    render(<Badge tone="mint">Completed</Badge>);
    expect(screen.getByText('Completed').className).toContain('text-mint');
  });

  it('falls back to the neutral tone for an unknown one', () => {
    render(<Badge tone="neon">Unknown</Badge>);
    expect(screen.getByText('Unknown').className).toContain('text-soft');
  });
});

describe('StatusBadge', () => {
  it('looks the status up in the map', () => {
    render(<StatusBadge map={TRADE_STATUS} status="COMPLETED" />);
    expect(screen.getByText('Completed').className).toContain('text-mint');
  });

  it('shows the raw status when the API sends something new', () => {
    render(<StatusBadge map={TRADE_STATUS} status="DISPUTED" />);
    expect(screen.getByText('DISPUTED')).toBeInTheDocument();
  });
});
