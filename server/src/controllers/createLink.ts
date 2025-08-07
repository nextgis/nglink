import { nanoid } from 'nanoid';
import { Request, RequestHandler } from 'express';
import NgwUploader from '@nextgis/ngw-uploader';

import { handleError } from '../utils/handleError';
import { env } from 'bun';

export const createLink: RequestHandler = async (req: Request, res) => {
  const {
    NGW_LOGIN: login,
    NGW_PASSWORD: password,
    NGW_URL: baseUrl,
    NGW_UPLOAD_GROUP: uploadGroup,
  } = env;

  if (!login || !password || !baseUrl || !uploadGroup) {
    return handleError(res, 'NGW configuration is not complete');
  }

  const uploader = new NgwUploader({
    baseUrl,
    auth: { login, password },
  });

  const { body } = req;
  const file = Buffer.from(JSON.stringify(body), 'utf8');
  const name = nanoid(8);
  return uploader
    .uploadVector(
      { file, name: name },
      {
        parentId: Number(uploadGroup),
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
