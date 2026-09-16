import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { api } = await import('../../lib/api.js');
const { useToastStore } = await import('../../store/toastStore.js');
const { TradeChat } = await import('./TradeChat.jsx');

const message = (overrides = {}) => ({
  id: 'm1',
  tradeId: 'trd_1',
  senderId: 'buyer',
  sender: { id: 'buyer', displayName: 'ada' },
  content: 'Sent via OPay',
  createdAt: '2026-09-01T12:00:00Z',
  ...overrides,
});

const imageFile = (name = 'proof.png', type = 'image/png', size = 1024) => {
  const file = new File([new Uint8Array(8)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderChat = (props = {}) => render(<TradeChat tradeId="trd_1" currentUserId="seller" {...props} />);

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockResolvedValue({ items: [message()] });
});

describe('TradeChat messages', () => {
  it('shows who said what', async () => {
    renderChat();
    expect(await screen.findByText('Sent via OPay')).toBeInTheDocument();
    expect(screen.getByText('ada')).toBeInTheDocument();
  });

  it('shows system messages without a sender', async () => {
    api.get.mockResolvedValue({
      items: [message({ id: 'm0', isSystem: true, content: '250 XLM is now locked in escrow.', sender: null })],
    });
    renderChat();
    expect(await screen.findByText('250 XLM is now locked in escrow.')).toBeInTheDocument();
    expect(screen.queryByText('ada')).not.toBeInTheDocument();
  });

  it('shows payment proof images as links to the full size', async () => {
    api.get.mockResolvedValue({ items: [message({ content: null, imageUrl: 'https://cdn.example/proof.png' })] });
    renderChat();

    expect(await screen.findByAltText('Payment proof')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://cdn.example/proof.png');
  });

  it('warns not to share passwords or OTPs', async () => {
    renderChat();
    expect(await screen.findByText(/Never share passwords or OTPs/)).toBeInTheDocument();
  });
});

describe('sending a message', () => {
  it('will not send an empty message', async () => {
    renderChat();
    await screen.findByText('Sent via OPay');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('posts the typed message and clears the box', async () => {
    api.post.mockResolvedValue(message({ id: 'm2', senderId: 'seller', content: 'Received, releasing now' }));
    renderChat();
    await screen.findByText('Sent via OPay');

    const box = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(box, 'Received, releasing now');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const [path, body] = api.post.mock.calls[0];
    expect(path).toBe('/trades/trd_1/messages');
    expect(body.get('content')).toBe('Received, releasing now');
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('reports a failed send without losing the draft', async () => {
    api.post.mockRejectedValue(new Error('Chat for this trade is closed'));
    renderChat();
    await screen.findByText('Sent via OPay');

    await userEvent.type(screen.getByPlaceholderText('Type a message…'), 'hello?');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Chat for this trade is closed' }),
    );
    expect(screen.getByPlaceholderText('Type a message…')).toHaveValue('hello?');
  });
});

describe('attaching payment proof', () => {
  const pick = (file) => {
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('accepts an image and shows it is attached', async () => {
    renderChat();
    await screen.findByText('Sent via OPay');

    pick(imageFile());
    expect(await screen.findByText('Attached: proof.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  it('rejects files that are not images', async () => {
    renderChat();
    await screen.findByText('Sent via OPay');

    pick(imageFile('receipt.pdf', 'application/pdf'));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Attach a JPEG, PNG or WebP image' }),
    );
    expect(screen.queryByText(/Attached:/)).not.toBeInTheDocument();
  });

  it('rejects images over 5 MB', async () => {
    renderChat();
    await screen.findByText('Sent via OPay');

    pick(imageFile('huge.png', 'image/png', 6 * 1024 * 1024));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Image must be 5 MB or smaller' }),
    );
  });

  it('can be removed before sending', async () => {
    renderChat();
    await screen.findByText('Sent via OPay');

    pick(imageFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Remove attachment' }));
    expect(screen.queryByText(/Attached:/)).not.toBeInTheDocument();
  });

  it('sends the image with the message', async () => {
    api.post.mockResolvedValue(message({ id: 'm3', imageUrl: 'https://cdn.example/proof.png' }));
    renderChat();
    await screen.findByText('Sent via OPay');

    pick(imageFile());
    await screen.findByText('Attached: proof.png');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(api.post.mock.calls[0][1].get('image')).toBeTruthy();
  });
});

describe('read-only chat for admins', () => {
  it('hides the composer', async () => {
    renderChat({ readOnly: true });
    await screen.findByText('Sent via OPay');
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
  });
});
