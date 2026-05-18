const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/icit-app.bundle.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  // Supabase is loaded via CDN script tag in Webflow; tell esbuild it's a global.
  external: [],
  // The bundle wraps everything in an IIFE — nothing exposed on window.
  globalName: undefined,
  minify: false,    // keep readable until Phase 4 is proven stable; minify then
  sourcemap: false,
};

if (watch) {
  esbuild.context(config).then(ctx => ctx.watch());
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
