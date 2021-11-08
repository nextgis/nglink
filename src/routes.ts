import { Router } from 'express';
import geojson from './controllers/geojson';

const router = Router();

router.get('/g', geojson);

export default router;
