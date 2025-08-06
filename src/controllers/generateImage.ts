import { Request, RequestHandler } from 'express';
import CDP from 'chrome-remote-interface';
import { launch, LaunchedChrome } from 'chrome-launcher';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

let chrome: LaunchedChrome;

const MAP_MAX_WIDTH = process.env.MAP_MAX_WIDTH
  ? parseInt(process.env.MAP_MAX_WIDTH, 10)
  : 2048;
const MAP_MAX_HEIGHT = process.env.MAP_MAX_HEIGHT
  ? parseInt(process.env.MAP_MAX_HEIGHT, 10)
  : 2048;

const imageCache = new LRUCache<string, Buffer>({
  maxSize: 100 * 1024 * 1024, // 100 MB
  sizeCalculation: (buffer) => buffer.length,
});

async function startChrome() {
  if (!chrome) {
    chrome = await launch({
      port: 9222,
      ignoreDefaultFlags: true,
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
      ],
    });
    console.log(`💻 Chrome started on port ${chrome.port}`);
  }
  return chrome;
}

function getMapRequestOptions(req: Request) {
  const params = req.method === 'POST' ? req.body : req.query;

  const geojson = params.geojson;
  const u = params.u?.toString();
  const color = params.color?.toString();
  const opacity =
    params.opacity !== undefined ? Number(params.opacity) : undefined;
  const strokeColor = params.strokeColor?.toString();
  const strokeOpacity =
    params.strokeOpacity !== undefined
      ? Number(params.strokeOpacity)
      : undefined;
  const weight =
    params.weight !== undefined ? Number(params.weight) : undefined;
  const bbox = params.bbox;
  const qmsId = params.qmsid;
  const requestedWidth = params.width ? Number(params.width) : 400;
  const requestedHeight = params.height ? Number(params.height) : 200;
  const width = Math.min(requestedWidth, MAP_MAX_WIDTH);
  const height = Math.min(requestedHeight, MAP_MAX_HEIGHT);
  const fitOffset = params.fitoffset;
  const fitPadding = params.fitpadding ? Number(params.fitpadding) : 5;
  const fitMaxZoom = params.fitmaxzoom ? Number(params.fitmaxzoom) : undefined;
  const protocol = req.protocol;

  let hostname = req.hostname || req.headers.host;
  if (hostname === 'localhost') {
    hostname = `localhost:${process.env.PORT || 3000}`;
  }

  const base = `${protocol}://${hostname}/`;
  const urlObj = new URL(base);

  if (u) urlObj.searchParams.set('u', u);
  if (color) urlObj.searchParams.set('color', color);
  if (opacity !== undefined) {
    urlObj.searchParams.set('opacity', opacity.toString());
  }
  if (strokeColor) urlObj.searchParams.set('strokeColor', strokeColor);
  if (strokeOpacity !== undefined) {
    urlObj.searchParams.set('strokeOpacity', strokeOpacity.toString());
  }
  if (weight !== undefined) {
    urlObj.searchParams.set('weight', weight.toString());
  }
  if (bbox) urlObj.searchParams.set('bbox', bbox.toString());
  if (qmsId) urlObj.searchParams.set('qmsid', qmsId.toString());
  if (fitOffset) urlObj.searchParams.set('fitoffset', fitOffset.toString());
  if (fitPadding !== undefined) {
    urlObj.searchParams.set('fitpadding', fitPadding.toString());
  }
  if (fitMaxZoom !== undefined) {
    urlObj.searchParams.set('fitmaxzoom', fitMaxZoom.toString());
  }

  const url = urlObj.toString();

  return {
    u,
    url,
    width,
    height,
    geojson,
  };
}

export const generateImage: RequestHandler = async (req, res) => {
  let clientRoot: CDP.Client | undefined;
  let clientTab: CDP.Client | undefined;

  const { u, url, width, height, geojson } = getMapRequestOptions(req);

  // Validate required parameter
  if (!u && !geojson) {
    return res
      .status(400)
      .json({ error: 'Parameter "u" or "geojson" is required.' });
  }

  const hash = crypto.createHash('md5');
  hash.update(url);
  hash.update(`${width}x${height}`);
  if (geojson) hash.update(JSON.stringify(geojson));
  const key = hash.digest('hex');

  const cached = imageCache.get(key);
  if (cached) {
    console.log('🚀 Serving from cache');
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(cached);
  }

  try {
    await startChrome();

    clientRoot = await CDP({ host: '127.0.0.1', port: chrome.port });
    const { Target } = clientRoot;

    const { targetId } = await Target.createTarget({ url: 'about:blank' });
    clientTab = await CDP({
      host: '127.0.0.1',
      port: chrome.port,
      target: targetId,
    });
    const { Page, Runtime, Emulation, DOM } = clientTab;

    await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);
    await Page.setLifecycleEventsEnabled({ enabled: true });

    await Emulation.setDeviceMetricsOverride({
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await Page.navigate({ url });
    await Page.loadEventFired();

    if (geojson) {
      await Runtime.evaluate({
        expression: `
          (async () => {
            // @ts-ignore
            await window.showMap(${JSON.stringify(geojson)});
          })();
        `,
        awaitPromise: true,
      });
    }
    await new Promise<void>((resolve) => {
      clientTab.Page.on('lifecycleEvent', (event) => {
        if (event.name === 'networkAlmostIdle') {
          resolve();
        }
      });
    });
    const {
      root: { nodeId: docId },
    } = await DOM.getDocument();
    const { nodeId: ctrlId } = await DOM.querySelector({
      selector: '.maplibregl-control-container',
      nodeId: docId,
    });
    if (ctrlId) await DOM.removeNode({ nodeId: ctrlId });

    const { data } = await Page.captureScreenshot({
      format: 'png',
      fromSurface: true,
    });
    const buffer = Buffer.from(data, 'base64');

    imageCache.set(key, buffer);

    await Target.closeTarget({ targetId });

    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image.' });
  } finally {
    if (clientTab) await clientTab.close();
    if (clientRoot) await clientRoot.close();
  }
};

process.on('exit', async () => {
  if (chrome) await chrome.kill();
});
