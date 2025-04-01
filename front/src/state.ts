import { StateManager } from './StateManager';

export const state = new StateManager({
  opacity: {
    value: 0.6,
    urlName: 'opacity',
    paintName: 'fillOpacity',
    forShare: true,
    parseStr: (val) => Number(val),
    urlRuntime: true,
  },
  color: {
    value: 'blue',
    urlName: 'color',
    paintName: 'fillColor',
    forShare: true,
    parseStr: (val) => String(val),
    urlRuntime: true,
  },
  strokeOpacity: {
    value: 1,
    urlName: 'strokeOpacity',
    paintName: 'strokeOpacity',
    forShare: true,
    parseStr: (val) => Number(val),
    urlRuntime: true,
  },
  strokeColor: {
    value: 'blue',
    urlName: 'strokeColor',
    paintName: 'strokeColor',
    forShare: true,
    parseStr: (val) => String(val),
    urlRuntime: true,
  },
  url: {
    value: '',
    urlName: 'u',
    forShare: true,
    parseStr: (val) => String(val),
  },
  qmsIdStr: {
    value: '',
    urlName: 'qmsid',
    forShare: true,
    parseStr: (val) => String(val),
  },
  qmsId: {
    value: undefined,
    urlName: 'qmsid',
    forShare: true,
    parseStr: (val) => Number(val),
  },
  bbox: {
    value: '',
    urlName: 'bbox',
    forShare: true,
    parseStr: (val) => val.split(',').map(Number),
  },
  fitOffset: {
    value: undefined as [number, number] | undefined,
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
    value: undefined as number | undefined,
    urlName: 'fitpadding',
    parseStr: (val) => Number(val),
  },
  fitMaxZoom: {
    value: undefined as number | undefined,
    urlName: 'fitmaxzoom',
    parseStr: (val) => Number(val),
  },
});
