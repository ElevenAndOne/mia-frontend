import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
          'framer-motion': ['framer-motion'],
          'three': ['three', '@react-three/fiber', '@react-three/drei']
        }
      }
    }
  },
})