import UrlRuntimeParams from '@nextgis/url-runtime-params';

import { appBlock, inputBlock } from './pages/home';
import { mapBlock, ngwMap } from './pages/map';
import { toggleBlock } from './utils/dom';

export const urlRuntime = new UrlRuntimeParams();

export function showInput() {
  if (ngwMap) ngwMap.destroy();
  urlRuntime.remove('u');
  toggleBlock(mapBlock, false);
  toggleBlock(appBlock, true);
  toggleBlock(inputBlock, true);
}
