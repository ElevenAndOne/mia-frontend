import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@screens': path.resolve(__dirname, './src/screens'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    strictPort: false, // Allow Vite to find another port if 5173 is busy
    host: '0.0.0.0', // Allow external connections for mobile testing
    watch: {
      ignored: ['**/backend/**', '**/.venv/**', '**/node_modules/**'] // Exclude backend and Python venv from file watching
    },
    // Proxy only for local development - removed for production deployment
    ...(process.env.NODE_ENV !== 'production' && {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          configure: () => {
            // Updated to match unified backend port (8000)
          }
        },
      }
    }),
    allowedHosts: true
  },
  build: {
    // Mobile performance optimizations
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large libraries for better mobile loading
          'framer-motion': ['framer-motion']
        }
      }
    }
  },
})