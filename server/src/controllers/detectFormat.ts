import { Request, RequestHandler } from 'express';
import axios from 'axios';
import NgwConnector from '@nextgis/ngw-connector';
import { fetchNgwLayerFeatureCollection } from '@nextgis/ngw-kit';

import { handleError } from '../utils/handleError';
import { isUrl } from '../utils/isUrl';
import { toGeoJson } from '../utils/toGeoJson';

import { GeoJSON } from 'geojson';
import { env } from 'bun';

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
      const referer = req.get('Referer');
      if (!referer) {
        return error('Referrer header is not set');
      }
      const refUrl = new URL(referer);
      const dataUrl = new URL(u);
      if (refUrl.hostname === dataUrl.hostname) {
        return error("You can't refer to yourself");
      }

      const response = await fetch(u, {
        headers: { Referer: referer },
      });
      if (!response.ok) {
        throw new Error(
          `Fetch failed: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      return makeResp(toGeoJson(body as string));
    } catch (er) {
      return error(er);
    }
  } else if (u.length === 8) {
    const login = env.NGW_LOGIN;
    const password = env.NGW_PASSWORD;
    if (!login || !password) {
      return error('NGW credentials are not set');
    }

    const connector = new NgwConnector({
      baseUrl: env.NGW_URL,
      auth: {
        login,
        password,
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
