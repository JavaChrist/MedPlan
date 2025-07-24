import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // S'assurer que les fichiers PWA sont bien copiés
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  }
})