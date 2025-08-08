import { build, env } from 'bun';
import chokidar from 'chokidar';
import { performance } from 'perf_hooks';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProd = env.NODE_ENV === 'production';

async function runBuild() {
  const start = performance.now();
  const result = await build({
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
  const duration = (performance.now() - start).toFixed(2);
  console.log(`✅ Build completed as ${duration}ms`);
}

await runBuild();

function runTypeCheck(watch = false) {
  const args = ['--preserveWatchOutput', '--noEmit'];
  if (watch) args.push('--watch');
  const tsc = spawn('tsc', args, { stdio: 'inherit' });
  return tsc;
}

if (!isWatch) {
  const tsc = runTypeCheck();
  tsc.on('close', (code) => {
    if (code === 0) {
      runBuild().catch((e) => console.error('❌ Build error:', e));
    } else if (code) {
      console.error(`❌ Type errors detected (exit code ${code}), aborting.`);
      process.exit(code);
    }
  });
} else {

  console.log('👀 Starting type-check watcher...');
  const tscWatch = runTypeCheck(true);
  runBuild().catch((e) => console.error('❌ Initial build error:', e));

  const watcher = chokidar.watch('src', { ignoreInitial: true });
  watcher.on('ready', () =>
    console.log('👀 File watcher ready, rebuilding on changes...'),
  );
  watcher.on('all', (event, path) => {
    console.log(`🔁 Detected ${event} at ${path}, rebuilding...`);
    runBuild().catch((e) => console.error('❌ Build error:', e));
  });

  process.on('exit', () => tscWatch.kill());
}
