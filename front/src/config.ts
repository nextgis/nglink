import UrlRuntimeParams from '@nextgis/url-runtime-params';

import type { MapConfig } from '../../common/MapConfig';
import type { PathPaint } from '@nextgis/paint';

interface Options {
  readUrl?: () => any;
  set?: () => void;
  forShare?: boolean;
  paintName?: keyof PathPaint;
  getValue?: () => any;
}
const urlRuntime = new UrlRuntimeParams();
export const config: Record<keyof MapConfig, Options> = {
  opacity: {
    readUrl() {
      return Number(`${urlRuntime.get('opacity') || 0.6}`);
    },
    set() {},
    forShare: true,
    paintName: 'fillOpacity',
    getValue() {
      const input = document.getElementById('alpha-select') as HTMLInputElement;
      return input ? Number(input.value) : 0.6;
    },
  },
  color: {
    readUrl() {
      return `${urlRuntime.get('color') || 'blue'}`;
    },
    set() {},
    forShare: true,
    paintName: 'fillColor',
    getValue() {
      const input = document.getElementById(
        'fill-color-select',
      ) as HTMLInputElement;
      return input ? input.value : 'blue';
    },
  },
  strokeOpacity: {
    readUrl() {
      return Number(`${urlRuntime.get('strokeOpacity') || 1}`);
    },
    set() {},
    forShare: true,
    paintName: 'strokeOpacity',
    getValue() {
      const input = document.querySelector(
        '.stroke-alpha-select',
      ) as HTMLInputElement;
      return input ? Number(input.value) : 1;
    },
  },
  strokeColor: {
    readUrl() {
      return `${urlRuntime.get('strokeColor') || 'blue'}`;
    },
    set() {},
    forShare: true,
    paintName: 'strokeColor',
    getValue() {
      const input = document.querySelector(
        '.stroke-color-select',
      ) as HTMLInputElement;
      return input ? input.value : 'blue';
    },
  },
  url: {
    readUrl() {
      return urlRuntime.get('u') || '';
    },
    set() {},
    forShare: true,
    getValue() {
      const input = document.querySelector('.share-input') as HTMLInputElement;
      return input ? input.value : '';
    },
  },
  qmsIdStr: {
    readUrl() {
      return urlRuntime.get('qmsid') || '';
    },
    set() {},
    forShare: true,
    getValue() {
      return urlRuntime.get('qmsid') || '';
    },
  },
  qmsId: {
    readUrl() {
      const qmsIdStr = urlRuntime.get('qmsid');
      return qmsIdStr ? Number(qmsIdStr) : undefined;
    },
    set() {},
    forShare: true,
    getValue() {
      const qmsIdStr = urlRuntime.get('qmsid');
      return qmsIdStr ? Number(qmsIdStr) : undefined;
    },
  },
  bbox: {
    readUrl() {
      return urlRuntime.get('bbox') || '';
    },
    set() {},
    forShare: true,
    getValue() {
      return urlRuntime.get('bbox') || '';
    },
  },
};
