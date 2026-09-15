import http from 'node:http';

/**
 * Starts an Express app on an ephemeral port and returns a `fetch` bound to it,
 * so route behaviour can be tested over real HTTP without extra dependencies.
 */
export async function startTestServer(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const call = (path, init) => fetch(`http://127.0.0.1:${port}${path}`, init);

  return {
    call,
    async json(path, init) {
      const response = await call(path, init);
      return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
