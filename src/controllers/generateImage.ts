import { Request, RequestHandler } from 'express';
import puppeteer from 'puppeteer';

export const generateImage: RequestHandler = async (req: Request, res) => {
  try {
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
    const width = params.width ? Number(params.width) : 400;
    const height = params.height ? Number(params.height) : 200;
    const fitOffset = params.fitoffset;
    const fitPadding = params.fitpadding ? Number(params.fitpadding) : 5;
    const fitMaxZoom = params.fitmaxzoom
      ? Number(params.fitmaxzoom)
      : undefined;
    const protocol = req.protocol;

    let hostname = req.hostname || req.headers.host;
    if (hostname === 'localhost') {
      hostname = `localhost:${process.env.PORT || 3000}`;
    }

    // Validate required parameter
    if (!u && !geojson) {
      return res
        .status(400)
        .json({ error: 'Parameter "u" or "geojson" is required.' });
    }

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    const page = await browser.newPage();

    await page.setViewport({
      width,
      height,
    });

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

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    if (geojson) {
      await page.evaluate((data) => {
        return new Promise((resolve) => {
          // @ts-expect-error workaround for missing types
          window.showMap(data).then(resolve);
        });
      }, geojson);
    }

    const el = await page.waitForSelector('.maplibregl-control-container');
    await el.evaluate((el) => {
      el.remove();
    });

    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'binary',
    });
    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(screenshot);
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: 'Failed to generate image.' });
  }
};
