import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = (env.VITE_BASE_PATH || '/').replace(/\/+$/, '/');
  // 小程序端没有 Vite 代理，必须使用可直连的绝对域名；
  // H5 端保持为空，走 devServer / nginx 同域转发。
  const isMpWeixin = process.env.UNI_PLATFORM === 'mp-weixin';
  const apiBaseUrl = isMpWeixin
    ? env.VITE_MP_API_BASE_URL || env.VITE_API_BASE_URL || 'https://aitj-api.xiancaozhenxuan.cn'
    : env.VITE_API_BASE_URL || '';

  return {
    base: basePath,
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
        // ===== 生产前缀（对齐 XCZX-admin 商城 C 端 /app-api）=====
        '/app-api': {
          target: env.VITE_DEV_TARGET || 'https://aitj-api.xiancaozhenxuan.cn',
          changeOrigin: true,
        },
        // ===== 旧前缀兼容（开发期本地联调 C 端 /app 路径的历史代码）=====
        '/app': {
          target: env.VITE_DEV_TARGET || 'https://aitj-api.xiancaozhenxuan.cn',
          changeOrigin: true,
        },
        '/ai': {
          target: env.VITE_DEV_TARGET || 'https://aitj-api.xiancaozhenxuan.cn',
          changeOrigin: true,
        },
        '/captchaImage': {
          target: env.VITE_DEV_TARGET || 'https://aitj-api.xiancaozhenxuan.cn',
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
