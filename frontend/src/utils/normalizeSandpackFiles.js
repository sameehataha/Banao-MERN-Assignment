/**
 * Sandpack file normalizer.
 *
 * template="react" default file structure:
 *   /index.js     → imports App from './App' and mounts it  (KEEP AS-IS)
 *   /App.js       → the root component                      (WE OVERRIDE THIS)
 *   /styles.css   → global styles                           (WE OVERRIDE THIS)
 *   /public/index.html → HTML shell                         (KEEP AS-IS)
 *
 * Our project stores source under /src/ (Vite layout).
 * We just need to point /App.js at our /src/App.jsx content
 * and /styles.css at our /src/index.css content.
 * The template's own /index.js handles mounting — we don't touch it.
 */

export const SANDPACK_SHIM_PATHS = ['/App.js', '/styles.css'];

export function normalizeSandpackFiles(files = {}, dependencies = {}) {
  const out = {};

  // Copy all source files, stripping previously generated shims
  const STRIP = new Set([
    '/App.js', '/App.jsx',
    '/index.js', '/index.jsx',
    '/styles.css',
    '/index.html', '/public/index.html',
    '/vite.config.js', '/vite.config.ts',
  ]);

  for (const [path, content] of Object.entries(files)) {
    if (!STRIP.has(path)) {
      out[path] = content;
    }
  }

  // /App.js — the template's /index.js does: import App from './App'
  // So we put our component here. It can use JSX because Sandpack transpiles it.
  if (out['/src/App.jsx']) {
    out['/App.js'] = out['/src/App.jsx'];
  } else if (out['/src/App.js']) {
    out['/App.js'] = out['/src/App.js'];
  }

  // /styles.css — the template's /index.js does: import './styles.css'
  if (out['/src/index.css']) {
    out['/styles.css'] = out['/src/index.css'];
  }

  // Clean package.json — strip Vite devDeps that crash the bundler
  let pkg = { name: 'react-sandbox', dependencies: {} };
  if (out['/package.json']) {
    try {
      const parsed = JSON.parse(out['/package.json']);
      pkg = {
        name: parsed.name || 'react-sandbox',
        dependencies: { ...(parsed.dependencies || {}) },
      };
    } catch { /* keep default */ }
  }

  pkg.dependencies = {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    ...pkg.dependencies,
    ...(dependencies || {}),
  };

  delete pkg.dependencies['vite'];
  delete pkg.dependencies['@vitejs/plugin-react'];
  delete pkg.dependencies['esbuild-wasm'];

  out['/package.json'] = JSON.stringify(pkg, null, 2);

  return out;
}

export function getSandpackEntry() {
  return '/index.js';
}

export function isShimPath(path) {
  return SANDPACK_SHIM_PATHS.includes(path);
}
