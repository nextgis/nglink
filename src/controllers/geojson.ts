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
    const geojson = getReq.data;
    if (isGeoJson(geojson)) {
      return res.status(200).send({
        geojson,
        type: typeof getReq.data,
      });
    } else {
      throw new Error('Is not valid GeoJSON');
    }
  } catch (er) {
    logger.error(er);
    return res.status(404).send({
      error: er,
    });
  }
};

function isGeoJson(str: string) {
  try {
    const json = JSON.parse(str);
    if ('type' in json) {
      return true;
    }
  } catch {
    //
  }
  return false;
}

export default geojson;
