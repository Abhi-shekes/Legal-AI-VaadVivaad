import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inotify events propagate across a Linux bind mount, so the watcher works as
// it does natively. On filesystems where they do not (a VM share, some NFS),
// set VITE_USE_POLLING=true rather than editing this file -- polling costs CPU
// continuously, so it stays opt-in.
const polling = process.env.VITE_USE_POLLING === 'true'

export default defineConfig({
  // Override with VITE_BASE_PATH at build time if deploying under a subpath
  // (e.g. behind an nginx location like /vaadvivaad/). Defaults to root.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    // Bind on all interfaces: inside a container, listening on localhost only
    // means the published port answers nothing.
    host: true,
    port: 5173,
    strictPort: true,
    watch: polling ? { usePolling: true, interval: 300 } : undefined,
  },
})
