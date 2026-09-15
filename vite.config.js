import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/app': {
        target: 'http://192.168.110.11:18081',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://192.168.110.11:18081',
        changeOrigin: true,
      },
      '/captchaImage': {
        target: 'http://192.168.110.11:18081',
        changeOrigin: true,
      },
    },
  },
});
