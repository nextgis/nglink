import { Request, RequestHandler } from 'express';
import puppeteer from 'puppeteer';

export const generateImage: RequestHandler = async (req: Request, res) => {
  try {
    const u = req.query.u?.toString();
    const color = req.query.color?.toString();
    const bbox = req.query.bbox;
    const qmsId = req.query.qmsid;
    const width = req.query.width ? Number(req.query.width) : 400;
    const height = req.query.height ? Number(req.query.height) : 200;
    const fitOffset = req.query.fitoffset;
    const fitPadding = req.query.fitpadding ? Number(req.query.fitpadding) : 5;
    const fitMaxZoom = req.query.fitmaxzoom
      ? Number(req.query.fitmaxzoom)
      : undefined;
    const protocol = req.protocol;

    let hostname = req.hostname || req.headers.host;
    if (hostname === 'localhost') {
      hostname = `localhost:${process.env.PORT || 3000}`;
    }

    // Validate required parameter
    if (!u) {
      return res.status(400).json({ error: 'Parameter "u" is required.' });
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

    let url = `${protocol}://${hostname}/?u=${u}`;

    if (color) {
      url += `&color=${encodeURIComponent(color)}`;
    }
    if (bbox) {
      url += `&bbox=${bbox}`;
    }
    if (qmsId) {
      url += `&qmsid=${qmsId}`;
    }
    if (fitOffset) {
      url += `&fitoffset=${fitOffset}`;
    }
    if (fitPadding !== undefined) {
      url += `&fitpadding=${fitPadding}`;
    }
    if (fitMaxZoom !== undefined) {
      url += `&fitmaxzoom=${fitMaxZoom}`;
    }

    await page.goto(url);
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
    });
    const el = await page.waitForSelector('.maplibregl-control-container');
    await el.evaluate((el) => el.remove());
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
