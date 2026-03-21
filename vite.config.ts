import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/',

    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy API calls to backend during local development
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY':        JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split large libraries into separate chunks
          manualChunks: {
            react:     ['react', 'react-dom'],
            recharts:  ['recharts'],
            lucide:    ['lucide-react'],
          },
        },
      },
    },
  };
});
