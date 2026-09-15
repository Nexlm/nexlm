import { API_URL as BASE_URL } from './config.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let handlers = {
  getToken: () => null,
  onUnauthorized: () => {},
};

/** Lets the auth store provide the token without a circular import. */
export function setAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

function buildUrl(path, query) {
  const url = `${BASE_URL}/api${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request(path, { method = 'GET', body, query, signal } = {}) {
  const token = handlers.getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach Nexlm. Check your connection and try again.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error ?? {};
    if (response.status === 401 && token) handlers.onUnauthorized();
    throw new ApiError(
      response.status,
      error.code ?? 'HTTP_ERROR',
      error.message ?? `Request failed (${response.status})`,
      error.details,
    );
  }

  return data;
}

export const api = {
  get: (path, query, options) => request(path, { ...options, query }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
