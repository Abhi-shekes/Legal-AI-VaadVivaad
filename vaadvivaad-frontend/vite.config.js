import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vaadvivaad/',       // 👈 required for correct asset paths
  plugins: [react()],
})
