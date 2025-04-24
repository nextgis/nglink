import cors from 'cors';
import { Router } from 'express';
import { json as jsonParser } from 'body-parser';
import { createLink } from './controllers/createLink';
import detectFormat from './controllers/detectFormat';
import { generateImage } from './controllers/generateImage';

const router = Router();

router.get('/d', detectFormat);
router.post('/create-link', cors(), createLink);
router
  .route('/img')
  .all(cors())
  .get(generateImage)
  .post(jsonParser(), generateImage);

export default router;
