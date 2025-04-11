import { StateManager } from './StateManager';

import type { MapConfig } from '../../common/MapConfig';

export const state = new StateManager<MapConfig>({
  opacity: {
    value: 0.6,
    urlName: 'opacity',
    paintName: 'fillOpacity',
    forShare: 'style',
    parseStr: (val) => Number(val),
    urlRuntime: true,
  },
  color: {
    value: 'blue',
    urlName: 'color',
    paintName: 'fillColor',
    forShare: 'style',
    parseStr: (val) => String(val),
    urlRuntime: true,
  },
  strokeOpacity: {
    value: 1,
    urlName: 'strokeOpacity',
    paintName: 'strokeOpacity',
    forShare: 'style',
    parseStr: (val) => Number(val),
    urlRuntime: true,
  },
  strokeColor: {
    value: 'blue',
    urlName: 'strokeColor',
    paintName: 'strokeColor',
    forShare: 'style',
    parseStr: (val) => String(val),
    urlRuntime: true,
  },
  url: {
    value: '',
    urlName: 'u',
    forShare: true,
    parseStr: (val) => String(val),
  },
  qmsId: {
    value: undefined,
    urlName: 'qmsid',
    forShare: 'map',
    parseStr: (val) => Number(val),
  },
  bbox: {
    value: undefined,
    urlName: 'bbox',
    forShare: 'map',
    parseStr: (val) => val.split(',').map(Number),
    toString: (val) => (Array.isArray(val) ? val.join(',') : String(val)),
  },
  fitOffset: {
    value: undefined,
    urlName: 'fitoffset',
    parseStr: (val) => {
      const offsetArray = val.split(',').map(Number);
      if (offsetArray.length === 1) {
        const size = offsetArray[0];
        return [size, size] as [number, number];
      }
      return [offsetArray[0], offsetArray[1]] as [number, number];
    },
  },
  fitPadding: {
    value: undefined,
    urlName: 'fitpadding',
    parseStr: (val) => Number(val),
  },
  fitMaxZoom: {
    value: undefined as number | undefined,
    urlName: 'fitmaxzoom',
    parseStr: (val) => Number(val),
  },
});
