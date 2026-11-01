import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The display face is only discovered after the CSS is parsed, so the hero
// headline and cover masthead could paint in Georgia first. This adds a
// <link rel="preload"> for the hashed Latin Newsreader file at build time.
function preloadDisplayFont() {
  return {
    name: 'preload-display-font',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const file = Object.keys(ctx.bundle || {}).find((name) =>
        /newsreader-latin-opsz-normal-[\w-]+\.woff2$/.test(name),
      );
      if (!file) return html;
      return {
        html,
        tags: [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadDisplayFont()],
  server: {
    port: 3000,
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
