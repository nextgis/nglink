import cors from 'cors';
import { Router } from 'express';
import { createLink } from './controllers/createLink';
import detectFormat from './controllers/detectFormat';
import { generateImage } from './controllers/generateImage';

const router = Router();

router.get('/d', detectFormat);
router.post('/create-link', cors(), createLink);
router.get('/', generateImage);

export default router;
