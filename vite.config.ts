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
