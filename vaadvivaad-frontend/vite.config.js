import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Override with VITE_BASE_PATH at build time if deploying under a subpath
  // (e.g. behind an nginx location like /vaadvivaad/). Defaults to root.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
