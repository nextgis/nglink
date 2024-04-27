import chalk from 'chalk';
import Transport from 'winston-transport';
import ConsoleLogger, { STYLES } from './index';

const levelStyleMap: { [key: string]: chalk.Chalk } = {
  error: STYLES.ERROR,
  warn: STYLES.WARN,
  info: STYLES.INFO,
  verbose: STYLES.VERBOSE,
  debug: STYLES.DEBUG,
  silly: STYLES.SILLY,
};

export default class ConsoleLogTransport extends Transport {
  private logger = new ConsoleLogger();
  // eslint-disable-next-line
  // @ts-ignore
  log(info: any, callback: { (): void }) {
    const style = levelStyleMap[info.level as string] || STYLES.DEBUG;
    // eslint-disable-next-line
    const label =
      // eslint-disable-next-line
      info.consoleLoggerOptions?.label! || (info.level as string).toUpperCase();
    const messages = [info.message];
    if (info.error) {
      messages.push(info.error);
    }
    this.logger.log(style, label, ...messages);
    callback();
  }
}
