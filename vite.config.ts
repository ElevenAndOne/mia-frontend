import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Always bind 5173 (matches backend CORS, FRONTEND_URL, and the Google console
    // origins/redirects). strictPort makes Vite ERROR if 5173 is taken instead of
    // silently drifting to 5174 (which would break OAuth origin/redirect matching).
    port: 5173,
    strictPort: true,
    // Dev: compile the route chunks up front instead of on first click.
    warmup: {
      clientFiles: [
        './src/pages/*.tsx',
        './src/components/app-shell-layout.tsx',
        './src/features/workspace/components/*.tsx',
        './src/features/marketing-context/views/*.tsx',
      ],
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
})
