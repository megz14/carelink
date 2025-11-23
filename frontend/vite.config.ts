import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path, // Don't rewrite the path
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Vite Proxy] Proxying request:', req.method, req.url);
            console.log('[Vite Proxy] Target:', proxyReq.getHeader('host'));
            console.log('[Vite Proxy] Path:', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Vite Proxy] Response status:', proxyRes.statusCode, 'for', req.url);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] ERROR:', err.message);
            console.error('[Vite Proxy] Error code:', err.code);
            console.error('[Vite Proxy] Request URL:', req.url);
          });
        },
      },
    }
  },
  build: {
    outDir: '../static/react',
    emptyOutDir: true,
  }
})
