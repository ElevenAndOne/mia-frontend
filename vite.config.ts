import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Replace the mock flag with a string literal so normal builds statically fold
  // `MOCK_MODE` to false and drop every mock branch — including the lazily-imported
  // MSW chunk. (A custom token is used instead of import.meta.env.* because Vite
  // special-cases import.meta.env and won't let `define` override it.)
  // `npm run dev:mock` / `build:mock` set VITE_USE_MOCKS=true to opt the preview in.
  define: {
    __USE_MOCKS__: JSON.stringify(process.env.VITE_USE_MOCKS ?? 'false'),
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
