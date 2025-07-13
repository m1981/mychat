import type { ProxyOptions } from 'vite';

/**
 * Shared proxy configuration for development server and tests
 * @param options Additional proxy options to merge
 * @returns Proxy configuration object
 */
export const createProxyConfig = (options: Partial<ProxyOptions> = {}): Record<string, ProxyOptions> => ({
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    secure: false,
    ws: true,
    configure: (proxy) => {
      // Increase timeouts
      proxy.options.proxyTimeout = 120000; // 2 minutes
      proxy.options.timeout = 120000;
      
      // Disable connection pooling to prevent socket reuse issues
      proxy.options.agent = false;
      
      // Handle proxy errors
      proxy.on('error', (err, req, res) => {
        console.log('Proxy error:', err);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json'
          });
        }
        res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
      });
    },
    ...options
  }
});