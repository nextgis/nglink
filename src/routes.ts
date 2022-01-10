import { Router } from 'express';
import detectFormat from './controllers/detectFormat';

const router = Router();

router.get('/d', detectFormat);

export default router;
