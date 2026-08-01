import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite always injects <script type="module"> in <head> regardless of format.
// In Android PWA standalone mode, deferred head scripts silently never execute.
// This plugin removes the Vite-injected script from <head> and re-injects it
// as a plain <script> at the END OF <body> — the most compatible approach.
const iifeScriptTag = {
  name: 'iife-script-tag',
  transformIndexHtml(html) {
    const match = html.match(/<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/);
    if (!match) return html;
    const src = match[1];
    // Remove from head
    let result = html.replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/, '');
    // Inject at end of body — no defer needed, DOM is already fully parsed here
    result = result.replace('</body>',
      `  <script onerror="window.__scriptErr=1" onload="window.__scriptOk=1" src="${src}"></script>\n</body>`
    );
    return result;
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
