import logger from '../logger';

import type { Response } from 'express';

export const handleError = (res: Response, er: unknown) => {
  logger.error(er);
  return res.status(404).send({
    error: er,
  });
};
