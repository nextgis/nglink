import c from 'ansi-colors';

const timestamp = () => new Date().toISOString();
type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

function log(level: LogLevel, ...messages: unknown[]) {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;

  let styled = prefix;
  switch (level) {
    case 'error':
      styled = c.bold.red(prefix);
      break;
    case 'warn':
      styled = c.yellow(prefix);
      break;
    case 'info':
      styled = c.cyan(prefix);
      break;
    case 'verbose':
      styled = c.magenta(prefix);
      break;
    case 'debug':
      styled = c.bold.yellow(prefix);
      break;
  }

  console.log(styled, ...messages);
}

export default {
  log,
  error: (...m: unknown[]) => log('error', ...m),
  warn: (...m: unknown[]) => log('warn', ...m),
  info: (...m: unknown[]) => log('info', ...m),
  verbose: (...m: unknown[]) => log('verbose', ...m),
  debug: (...m: unknown[]) => log('debug', ...m),
};
