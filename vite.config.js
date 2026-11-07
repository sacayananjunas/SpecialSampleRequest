import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    // All /api calls go to the local Express server that runs the same /api files as Vercel
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: false } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers', '@dnd-kit/core', 'qrcode.react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
