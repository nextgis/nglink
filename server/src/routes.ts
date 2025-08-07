import cors from 'cors';
import { Router, RequestHandler } from 'express';
import { json as jsonParser } from 'body-parser';
import { createLink } from './controllers/createLink';
import detectFormat from './controllers/detectFormat';
import { generateImage } from './controllers/generateImage';
import { env } from 'bun';

const allowedIp = env.ALLOWED_IP?.split(',').map((ip) => ip.trim()) || [];

const normalizeIp = (ip: string) => {
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip;
};

const ipFilter: RequestHandler = (req, res, next) => {
  const rawIp = req.socket.remoteAddress || '';
  const clientIp = normalizeIp(rawIp);

  if (clientIp && allowedIp.includes(clientIp)) {
    return next();
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
};

const router = Router();

router.get('/d', detectFormat);
router.post('/create-link', cors(), createLink);
router
  .route('/img')
  .all(cors())
  .get(generateImage)
  .post(jsonParser(), generateImage);

export default router;
