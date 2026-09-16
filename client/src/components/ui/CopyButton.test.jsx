import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton.jsx';

const stubClipboard = (writeText) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
};

afterEach(() => vi.restoreAllMocks());

describe('CopyButton', () => {
  it('copies the value and confirms it', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    render(<CopyButton value="GABC…XYZ" />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('GABC…XYZ');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
  });

  it('stays usable when the clipboard is blocked', async () => {
    stubClipboard(vi.fn(async () => { throw new Error('denied'); }));
    render(<CopyButton value="GABC…XYZ" />);

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('can be icon-only with an accessible name', () => {
    stubClipboard(vi.fn());
    render(<CopyButton value="GABC" label="" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
