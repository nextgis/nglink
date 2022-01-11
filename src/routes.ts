import { Router } from 'express';
import { createLink } from './controllers/createLink';
import detectFormat from './controllers/detectFormat';

const router = Router();

router.get('/d', detectFormat);
router.post('/create-link', createLink);

export default router;
