const esbuild = require('esbuild');
const path = require('path');
const root = path.resolve(__dirname, '..');

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['./scripts/vercel-blob-browser-entry.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'vendor/vercel-blob-client.js',
  target: ['es2020'],
});
