import { Request, RequestHandler } from 'express';
import puppeteer from 'puppeteer';

export const generateImage: RequestHandler = async (req: Request, res) => {
  const u = req.query.u.toString();
  const color = req.query.color;
  const bbox = req.query.bbox;
  const qmsId = req.query.qmsId;
  const width = req.query.width ? Number(req.query.width) : 400;
  const height = req.query.height ? Number(req.query.height) : 200;
  const protocol = req.protocol;
  let hostname = req.hostname || req.headers.host;
  if (hostname === 'localhost') {
    hostname = `localhost:${process.env.PORT || 3000}`;
  }
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ignoreDefaultArgs: ['--disable-extensions'],
  });
  const page = await browser.newPage();

  page.setViewport({
    width,
    height,
  });

  let url = `${protocol}://${hostname}/?u=${u}`;
  if (color) {
    url += `&color=${color}`;
  }
  if (bbox) {
    url += `&bbox=${bbox}`;
  }
  if (qmsId) {
    url += `&qmsId=${qmsId}`;
  }

  await page.goto(url);
  await page.waitForNavigation({
    waitUntil: 'networkidle0',
  });
  const el = await page.waitForSelector('.maplibregl-control-container');
  await el.evaluate((el) => el.remove());
  const screenshot = await page.screenshot({ type: 'png', encoding: 'binary' });
  await browser.close();

  res.setHeader('Content-Type', 'image/png');
  return res.status(200).send(screenshot);
};
