import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  setAuthHandlers: vi.fn(),
}));
vi.mock('../lib/socket.js', () => ({ getSocket: vi.fn(), disconnectSocket: vi.fn() }));

const { api, setAuthHandlers } = await import('../lib/api.js');
const { disconnectSocket } = await import('../lib/socket.js');
const { useAuthStore, useIsAdmin } = await import('./authStore.js');

const user = { id: 'usr_1', displayName: 'ada', role: 'USER' };

// Registered when the store module first loads, before any test clears the mocks.
const [apiHandlers] = setAuthHandlers.mock.calls[0];

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
});

describe('login', () => {
  it('stores the session and returns the user', async () => {
    api.post.mockResolvedValue({ user, token: 'tok' });
    expect(await useAuthStore.getState().login({ email: 'ada@x.ng', password: 'naira2026' })).toEqual(user);
    expect(useAuthStore.getState()).toMatchObject({ user, token: 'tok' });
  });

  it('leaves the store untouched when the credentials are wrong', async () => {
    api.post.mockRejectedValue(new Error('Incorrect email or password'));
    await expect(useAuthStore.getState().login({})).rejects.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe('register', () => {
  it('signs the new trader straight in', async () => {
    api.post.mockResolvedValue({ user, token: 'tok' });
    await useAuthStore.getState().register({ email: 'ada@x.ng', password: 'naira2026', displayName: 'ada' });
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ displayName: 'ada' }));
    expect(useAuthStore.getState().token).toBe('tok');
  });
});

describe('logout', () => {
  it('clears the session and drops the socket', () => {
    useAuthStore.setState({ token: 'tok', user });
    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
    expect(disconnectSocket).toHaveBeenCalled();
  });
});

describe('refreshUser', () => {
  it('pulls fresh verification flags', async () => {
    useAuthStore.setState({ token: 'tok', user });
    api.get.mockResolvedValue({ user: { ...user, emailVerified: true } });

    await useAuthStore.getState().refreshUser();
    expect(useAuthStore.getState().user.emailVerified).toBe(true);
  });

  it('does nothing for a logged-out visitor', async () => {
    expect(await useAuthStore.getState().refreshUser()).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('token handlers', () => {
  it('lets the API client read the token and log the user out', () => {
    const { getToken, onUnauthorized } = apiHandlers;

    useAuthStore.setState({ token: 'tok', user });
    expect(getToken()).toBe('tok');

    onUnauthorized();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe('useIsAdmin', () => {
  it('is a selector over the session role', () => {
    useAuthStore.setState({ token: 'tok', user });
    expect(useAuthStore.getState().user.role).toBe('USER');
    expect(typeof useIsAdmin).toBe('function');
  });
});
