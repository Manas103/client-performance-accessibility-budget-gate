// Starts a static preview server for an already-built variant on an ephemeral port
// (preview.port: 0, Vite lets the OS pick a free port), reads back the bound port, and
// exposes a close() that shuts down that exact server. Uses Vite's own preview() JS API
// in-process rather than spawning `vite preview` as a subprocess: there is no separate OS
// process or PID to leak, and close() is guaranteed to stop exactly (and only) the server
// this call started, honoring the "never touch a port or process you didn't start" rule.
import { preview } from 'vite';

export async function startPreviewServer(fixtureAppRoot, distDir) {
  const server = await preview({
    root: fixtureAppRoot,
    build: { outDir: distDir },
    preview: { port: 0, strictPort: false, host: '127.0.0.1' },
    logLevel: 'silent',
  });

  const address = server.httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('preview server did not bind a TCP port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    port: address.port,
    async close() {
      await server.close();
    },
  };
}
