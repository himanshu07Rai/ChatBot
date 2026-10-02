import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// The backend URL is read in app code as `import.meta.env.VITE_BACKEND_URL`,
// which Vite exposes natively from any `VITE_`-prefixed variable (from a .env
// file or from process env at build time). No `define` shim is needed.
export default defineConfig(() => {
  return {
    plugins: [react()],
    server:{
      port: 3001,
    }
  }
})