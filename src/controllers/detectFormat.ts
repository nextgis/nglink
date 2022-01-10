import { Request, RequestHandler } from 'express';

import axios from 'axios';
import logger from '../logger';

import { isUrl } from '../utils/isUrl';
import { toGeoJson } from '../utils/toGeoJson';

import { GeoJSON } from 'geojson';

const detectFormat: RequestHandler = async (req: Request, res) => {
  let { u } = req.query;

  if (!u || typeof u !== 'string') {
    return res.status(500).send({
      error: 'GeoJSON or WKT data or a link to them are not set',
    });
  }
  u = u.trim();
  const makeResp = (geojson: GeoJSON | false) => {
    if (geojson) {
      return res.status(200).send({
        geojson,
      });
    } else {
      throw new Error('Is not valid GeoJSON');
    }
  };

  const handleError = (er: unknown) => {
    logger.error(er);
    return res.status(404).send({
      error: er,
    });
  };

  if (isUrl(u)) {
    try {
      const getReq = await axios(u);
      return makeResp(toGeoJson(getReq.data));
    } catch (er) {
      return handleError(er);
    }
  } else {
    console.log(u);
    return makeResp(toGeoJson(u));
  }
};

export default detectFormat;
