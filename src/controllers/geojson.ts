import { Request, RequestHandler } from 'express';

import logger from '../logger';
import axios from 'axios';

const geojson: RequestHandler = async (req: Request, res) => {
  const { u } = req.query;
  logger.silly(`Get geojson from: ${u}`);
  if (!u || typeof u !== 'string') {
    return res.status(500).send({
      error: 'url not set',
    });
  }
  try {
    const getReq = await axios(u);
    return res.status(200).send({
      geojson: getReq.data,
    });
  } catch (er) {
    logger.error(er);
    return res.status(404).send({
      error: er,
    });
  }
};

export default geojson;
