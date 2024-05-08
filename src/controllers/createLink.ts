import { nanoid } from 'nanoid';
import { Request, RequestHandler } from 'express';
import NgwUploader from '@nextgis/ngw-uploader';

import { handleError } from '../utils/handleError';

export const createLink: RequestHandler = async (req: Request, res) => {
  const uploader = new NgwUploader({
    baseUrl: process.env.NGW_URL,
    auth: { login: process.env.NGW_LOGIN, password: process.env.NGW_PASSWORD },
  });

  const { body } = req;
  const file = Buffer.from(JSON.stringify(body), 'utf8');
  const name = nanoid(8);
  return uploader
    .uploadVector(
      { file, name: name },
      {
        parentId: Number(process.env.NGW_UPLOAD_GROUP),
        keyname: name,
        paint: { color: '#00A', weight: 1, opacity: 1 },
        addTimestampToName: true,
      },
    )
    .then(() => {
      return res.status(201).send({ keyname: name });
    })
    .catch(() => {
      return handleError(res, 'Unable to create a link');
    });
};
