import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = (env.VITE_BASE_PATH || '/').replace(/\/+$/, '/');
  const apiBaseUrl = env.VITE_API_BASE_URL || '';

  return {
    base: basePath,
    publicDir: 'static',
    plugins: [uni()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    define: {
      __APP_BASE_PATH__: JSON.stringify(basePath),
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 5173),
      strictPort: false,
      proxy: {
        '/app': {
          target: env.VITE_DEV_TARGET || 'http://192.168.110.11:18081',
          changeOrigin: true,
        },
        '/ai': {
          target: env.VITE_DEV_TARGET || 'http://192.168.110.11:18081',
          changeOrigin: true,
        },
        '/captchaImage': {
          target: env.VITE_DEV_TARGET || 'http://192.168.110.11:18081',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.VITE_PREVIEW_PORT || 4173),
    },
    build: {
      target: 'es2017',
      cssTarget: 'es2017',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: 'esbuild',
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
            return null;
          },
        },
      },
    },
  };
});
