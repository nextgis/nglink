import { build, env } from 'bun';

const isProd = env.NODE_ENV === 'production';

await build({
  entrypoints: ['src/index.html'],
  outdir: 'dist',

  splitting: true,

  target: 'browser',
  format: 'esm',

  sourcemap: isProd ? 'linked' : 'inline',

  minify: isProd,
  publicPath: '',

  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.svg': 'file',
    '.gif': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.eot': 'file',
    '.ttf': 'file',
    '.otf': 'file',
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    __BROWSER__: 'true',
    __DEV__: String(!isProd),
  },

  env: 'inline',
});
