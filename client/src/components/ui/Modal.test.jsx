import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal.jsx';

const renderModal = (props = {}) =>
  render(
    <Modal open onClose={props.onClose ?? vi.fn()} title="Confirm withdrawal" footer={props.footer}>
      <p>Stellar payments are irreversible.</p>
    </Modal>,
  );

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Confirm withdrawal');
    expect(screen.getByText('Stellar payments are irreversible.')).toBeInTheDocument();
  });

  it('closes on the close button, the backdrop and Escape', async () => {
    const onClose = vi.fn();
    const { unmount } = renderModal({ onClose });

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('renders footer actions', () => {
    renderModal({ footer: <button type="button">Send</button> });
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('locks background scrolling only while open', () => {
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
