import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite always injects <script type="module"> regardless of Rollup format.
// This plugin strips type="module" and crossorigin so the IIFE bundle loads
// as a plain <script> — required for Android PWA standalone mode where
// ES module loading silently hangs in some Chrome/WebView configurations.
const iifeScriptTag = {
  name: 'iife-script-tag',
  transformIndexHtml(html) {
    return html.replace(
      /<script type="module" crossorigin (src="\/assets\/[^"]+"><\/script>)/g,
      '<script defer onerror="window.__scriptErr=1" onload="window.__scriptOk=1" $1'
    );
  },
};

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
    iifeScriptTag,
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'iife',
        name: '__app',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
