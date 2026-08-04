import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite always injects <script type="module"> in <head> regardless of format.
// In Android PWA standalone mode, deferred head scripts silently never execute.
// This plugin:
//   1. Removes the Vite-injected module script from <head>
//   2. Injects window.__assetSrc / window.__htmlVer early (before #root) for diagnostics
//   3. Re-injects the bundle as a plain <script> at end of <body>
const iifeScriptTag = {
  name: 'iife-script-tag',
  transformIndexHtml(html) {
    const match = html.match(/<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/);
    if (!match) return html;
    const src = match[1];
    // Remove module script from head
    let result = html.replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/, '');
    // Inject version + asset-src marker before #root (runs early, helps diagnostics & fallback)
    result = result.replace(
      '<div id="root">',
      `<script>window.__assetSrc="${src}";window.__htmlVer="v24";</script>\n    <div id="root">`
    );
    // Static script tag at end of body — no defer needed, DOM is fully parsed here
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
      input: 'app.html',
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
