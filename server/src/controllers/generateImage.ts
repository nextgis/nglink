import { Request, RequestHandler } from 'express';
import CDP from 'chrome-remote-interface';
import { launch, LaunchedChrome } from 'chrome-launcher';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { env } from 'bun';

let chrome: LaunchedChrome | undefined = undefined;
let rootClient: CDP.Client | undefined;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const POOL_SIZE = Math.max(1, Number(env.RENDER_POOL_SIZE ?? 4));

const SAFETY_CAP_MS = env.RENDER_SAFETY_CAP_MS
  ? parseInt(env.RENDER_SAFETY_CAP_MS, 10)
  : 10000; // 10 seconds




  const MAP_MAX_WIDTH = env.MAP_MAX_WIDTH
  ? parseInt(env.MAP_MAX_WIDTH, 10)
  : 2048;
const MAP_MAX_HEIGHT = env.MAP_MAX_HEIGHT
  ? parseInt(env.MAP_MAX_HEIGHT, 10)
  : 2048;

const imageCache = new LRUCache<string, Buffer>({
  maxSize: 100 * 1024 * 1024, // 100 MB
  sizeCalculation: (buffer) => buffer.length,
});

const CHROME_HOST = '127.0.0.1';
const PORT = Number(env.CHROME_DEBUG_PORT ?? 9222);

class Semaphore {
  private max: number;
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
    return () => this.release();
  }

  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}
const renderGate = new Semaphore(POOL_SIZE);

async function startChrome() {
  if (!chrome) {
    try {
      await CDP({ host: CHROME_HOST, port: PORT });
      console.log(`🔗 Reusing existing Chrome on port ${PORT}`);
    } catch {
      chrome = await launch({
        port: PORT,
        ignoreDefaultFlags: true,
        chromeFlags: [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-extensions',
          '--mute-audio',
          '--hide-scrollbars',
          '--enable-precise-memory-info',
        ],
      });
      console.log(`💻 Chrome started on port ${chrome.port}`);
      const kill = async () => {
        try {
          await chrome?.kill();
        } catch {}
        process.exit(0);
      };
      process.on('SIGINT', kill);
      process.on('SIGTERM', kill);
    }
  }
  if (!rootClient) {
    rootClient = await CDP({ host: CHROME_HOST, port: PORT });
    await rootClient.Target.setDiscoverTargets({ discover: false });
  }
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
  let clientTab: CDP.Client | undefined;
  let targetId: string | undefined;

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
  const release = await renderGate.acquire();

  try {
    await startChrome();
    const { Target } = rootClient!;

    ({ targetId } = await Target.createTarget({ url: 'about:blank' }));

    clientTab = await CDP({ host: CHROME_HOST, port: PORT, target: targetId });
    const { Page, Runtime, Emulation, DOM } = clientTab;

    await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);
    await Page.setLifecycleEventsEnabled({ enabled: true });

    await Emulation.setDeviceMetricsOverride({
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const buffer = await renderBuffer({
      clientTab,
      url,
      geojson,
    });

    imageCache.set(key, buffer);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(buffer);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error generating image:', error);

    try {
      if (clientTab) {
        const { Page } = clientTab;
        const url = generateErrorPage(error, width, height);
        await Page.navigate({ url });
        await Page.loadEventFired();
        const { data: errData } = await clientTab.Page.captureScreenshot({
          format: 'png',
          fromSurface: true,
        });
        const errBuffer = Buffer.from(errData, 'base64');

        res.setHeader('Content-Type', 'image/png');
        return res.status(500).send(errBuffer);
      }
    } catch (renderErr) {
      console.error('Error rendering error image:', renderErr);
    }
    return res
      .status(500)
      .type('text/plain')
      .send(`Error generating image: ${error.message}`);
  } finally {
    try {
      if (clientTab) {
        await clientTab.close();
      }
    } catch {
      // pass
    }
    try {
      if (rootClient && targetId) {
        await rootClient.Target.closeTarget({ targetId });
      }
    } catch {
      // pass
    }
    release();
  }
};

async function renderBuffer({
  url,
  clientTab,
  geojson,
}: {
  url: string;
  clientTab: CDP.Client;
  geojson?: any;
}): Promise<Buffer> {
  const timeoutPromise = new Promise<Buffer>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Timeout: screenshot not received within ${SAFETY_CAP_MS} ms`,
          ),
        ),
      SAFETY_CAP_MS,
    ),
  );

  return await Promise.race([
    getBuffer({ clientTab, url, geojson }),
    timeoutPromise,
  ]);
}

async function getBuffer({
  url,
  clientTab,
  geojson,
}: {
  url: string;
  clientTab: CDP.Client;
  geojson?: any;
}): Promise<Buffer> {
  const { Page, Runtime, DOM } = clientTab;
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
  const {
    root: { nodeId: docId },
  } = await DOM.getDocument();

  let ctrlId: number | null = null;

  while (!ctrlId) {
    const [ctrlRes, errRes] = await Promise.all([
      DOM.querySelector({
        selector: '.maplibregl-control-container',
        nodeId: docId,
      }),
      DOM.querySelector({
        selector: '#error-block',
        nodeId: docId,
      }),
    ]);

    ctrlId = ctrlRes.nodeId;
    const errorNodeId = errRes.nodeId;

    if (errorNodeId) {
      const { attributes } = await DOM.getAttributes({ nodeId: errorNodeId });
      const idx = attributes.findIndex((attrName) => attrName === 'class');
      const classList = idx >= 0 ? attributes[idx + 1]!.split(/\s+/) : [];

      if (!classList.includes('hidden')) {
        throw new Error('Map rendering failed. Check your input data.');
      }
    }

    if (!ctrlId) {
      await sleep(100);
    }
  }
  await Runtime.evaluate({
    expression: `
        (async () => {
          await new Promise(resolve => {
            const interval = setInterval(() => {
              if (window.mapLoaded) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          });
        })();
      `,
    awaitPromise: true,
  });

  if (ctrlId) await DOM.removeNode({ nodeId: ctrlId });

  const { data } = await Page.captureScreenshot({
    format: 'png',
    fromSurface: true,
  });
  return Buffer.from(data, 'base64');
}

function generateErrorPage(
  error: Error,
  width: number,
  height: number,
): string {
  const message = error.message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const skullSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <text x="0" y="24" font-size="16" fill="#ddd">💀</text>
    </svg>
  `);
  const exclamSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <text x="0" y="24" font-size="16" fill="#ddd">⚠️</text>
    </svg>
  `);

  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          html, body {
            margin: 0;
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
          }
          body {
            position: relative;
            background: #fff;
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          body::before {
            content: "";
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-image:
              url("data:image/svg+xml,${skullSvg}"),
              url("data:image/svg+xml,${exclamSvg}");
            background-repeat: repeat, repeat;
            background-size: 64px 64px;
            background-position: 0 0, 32px 32px;
            opacity: 0.2;
            z-index: 0;
          }

          .err {
            position: relative;
            z-index: 1;
            color: #c00;
            font-size: 1.5rem;
            line-height: 1.4;
            text-align: center;
            max-width: 80%;
          }
        </style>
      </head>
      <body>
        <div class="err">${message}</div>
      </body>
    </html>
  `;

  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}
