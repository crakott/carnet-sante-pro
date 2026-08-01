import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
  ],
  build: {
    outDir: 'dist',
    // Disable automatic <link rel="modulepreload"> injection: in Android
    // standalone PWA mode, a failed modulepreload is cached as an error and
    // causes the module to silently fail when actually requested by the main
    // script — the app never mounts. Without these hints the modules load
    // normally on demand (slightly less optimal but always works).
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
          ],
        },
      },
    },
  },
})
