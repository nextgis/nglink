import { createLogger, format } from 'winston';
import ConsoleLoggerTransport from './lib/console-logger/winston-transport';

const logTransports = [new ConsoleLoggerTransport()];

const logger = createLogger({
  format: format.combine(format.timestamp()),
  transports: logTransports,
  defaultMeta: { service: 'api' },
  level: process.env.NODE_ENV === 'development' ? 'silly' : 'info',
});

export default logger;
