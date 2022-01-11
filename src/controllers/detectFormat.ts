import { Request, RequestHandler } from 'express';
import axios from 'axios';
import NgwConnector from '@nextgis/ngw-connector';
import { fetchNgwLayerFeatureCollection } from '@nextgis/ngw-kit';

import { handleError } from '../utils/handleError';
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
  const makeResp = (geojson: GeoJSON | false, link = false) => {
    if (geojson) {
      return res.status(200).send({
        geojson,
        link,
      });
    } else {
      return error('Is not valid GeoJSON');
    }
  };

  const error = (er: unknown) => {
    return handleError(res, er);
  };

  if (isUrl(u)) {
    try {
      const refUrl = new URL(req.get('Referrer'));
      const dataUrl = new URL(u);
      if (refUrl.hostname === dataUrl.hostname) {
        return error("You can't refer to yourself");
      }
      const getReq = await axios(u);
      return makeResp(toGeoJson(getReq.data));
    } catch (er) {
      return error(er);
    }
  } else if (u.length === 8) {
    const connector = new NgwConnector({
      baseUrl: process.env.NGW_URL,
      auth: {
        login: process.env.NGW_LOGIN,
        password: process.env.NGW_PASSWORD,
      },
    });
    return connector
      .getResourceIdOrFail(u)
      .then((resourceId) => {
        return fetchNgwLayerFeatureCollection({ connector, resourceId }).then(
          (g) => {
            return makeResp(g, true);
          },
        );
      })
      .catch(() => {
        return error('Vector data cannot be restored by reference');
      });
  } else {
    return makeResp(toGeoJson(u));
  }
};

export default detectFormat;
