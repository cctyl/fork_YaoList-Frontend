import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8180',
        changeOrigin: true,
        secure: false, // 支持WebSocket代理
        timeout: 600000, // 10分钟超时
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 确保 cookie 被转发
            if (req.headers.cookie) {
              proxyReq.setHeader('cookie', req.headers.cookie);
            }
          });
          // 设置代理超时
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
        },
      },
      '/download': {
        target: 'http://127.0.0.1:8180',
        changeOrigin: true,
        secure: false,
      },
      '/dlink': {
        target: 'http://127.0.0.1:8180',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
