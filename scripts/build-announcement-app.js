const esbuild = require('esbuild');
const path = require('path');

const root = path.resolve(__dirname, '..');
const browserPath = value => value.replace(/\\/g, '/');

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: [browserPath(path.join(root, 'src', 'announcement-app.jsx'))],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: browserPath(path.join(root, 'vendor', 'announcement-app.js')),
  target: ['es2020'],
  jsx: 'automatic',
});

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: [browserPath(path.join(root, 'src', 'faq-app.jsx'))],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: browserPath(path.join(root, 'vendor', 'faq-app.js')),
  target: ['es2020'],
  jsx: 'automatic',
});
