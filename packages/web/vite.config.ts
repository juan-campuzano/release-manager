import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output directory for production build
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Form libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // HTTP and utilities
          'utils-vendor': ['axios'],
          // Charts
          'charts-vendor': ['recharts'],
        },
      },
    },
    // Chunk size warning limit (in KB)
    chunkSizeWarningLimit: 1000,
  },
});
