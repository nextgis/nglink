import { env } from 'bun';
import app from './app';
import logger from './logger';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🌏 Express server started at http://localhost:${PORT}`);
});
