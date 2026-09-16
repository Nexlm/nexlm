import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.jsx';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Release XLM</Button>);
    expect(screen.getByRole('button', { name: 'Release XLM' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Open trade</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Locking escrow</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Cancel</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('styles destructive actions differently from primary ones', () => {
    const { rerender } = render(<Button variant="danger">Cancel trade</Button>);
    expect(screen.getByRole('button').className).toContain('bg-ember');
    rerender(<Button variant="primary">Release</Button>);
    expect(screen.getByRole('button').className).toContain('bg-leaf');
  });
});
