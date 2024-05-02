import { Request, RequestHandler } from 'express';
import puppeteer from 'puppeteer';

export const generateImage: RequestHandler = async (req: Request, res) => {
  const u = req.query.u.toString();
  const color = req.query.color ? req.query.color : '00F';
  const width = req.query.width ? Number(req.query.width) : 400;
  const height = req.query.height ? Number(req.query.height) : 200;
  let hostname = req.hostname;
  if (hostname === 'localhost') {
    hostname = 'localhost' + ':' + process.env.PORT;
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.setViewport({
    width: width,
    height: height,
  });

  await page.goto('http://' + hostname + `/view/?u=${u}&color=${color}`);
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
