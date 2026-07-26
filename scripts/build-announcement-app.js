const esbuild = require('esbuild');
const path = require('path');

const root = path.resolve(__dirname, '..');

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['./src/announcement-app.jsx'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'vendor/announcement-app.js',
  target: ['es2020'],
  jsx: 'automatic',
});

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['./src/faq-app.jsx'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'vendor/faq-app.js',
  target: ['es2020'],
  jsx: 'automatic',
});
