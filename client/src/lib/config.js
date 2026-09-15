const configured = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/**
 * API origin. In development it's empty so Vite proxies /api and /socket.io.
 * Production builds default to the Vercel-hosted API; set VITE_API_URL to
 * point a deployment somewhere else.
 */
export const API_URL = configured || (import.meta.env.PROD ? 'https://nexlm-server.vercel.app' : '');
