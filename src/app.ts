import compression from 'compression';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';

import ApplicationError from './errors/application-error';
import routes from './routes';
import logger from './logger';

const app = express();

function logResponseTime(req: Request, res: Response, next: NextFunction) {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    const message = `
    ${req.method} ${res.statusCode} ${elapsedTimeInMs}ms\t${req.path}
    `;
    logger.log({
      level: 'debug',
      message,
      consoleLoggerOptions: { label: 'API' },
    });
  });

  next();
}

//Here we are configuring express to use body-parser as middle-ware.
app.use(express.json({ limit: '15mb' }));
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(logResponseTime);

app.use(compression());

app.use(
  '/',
  express.static(path.join(__dirname, '../front/dist'), {
    maxAge: 31557600000,
  }),
);

app.use(routes);
app.use(compression());

app.use(
  (err: ApplicationError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    return res.status(err.status || 500).json({
      error: err.message,
    });
  },
);

export default app;
