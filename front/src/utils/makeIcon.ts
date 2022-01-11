import type { MakeIconOptions } from '../interfaces';

export function makeIcon(str: string, opt: MakeIconOptions = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
    opt.height || 24
  } ${opt.width || 24}" role="img" aria-hidden="true" class="icon__svg">
  <path d="${str}" />
  </svg>`;
}
