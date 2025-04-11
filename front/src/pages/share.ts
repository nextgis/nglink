import { Clipboard } from '@nextgis/utils';

import { urlRuntime } from '../common';
import { state } from '../state';
import { toggleBlock } from '../utils/dom';

import type { MapConfig } from '../../../common/MapConfig';
import type { GeoJSON } from 'geojson';

let savedUrl: string | null = null;

export function createShareContent(geojson: GeoJSON, url?: string) {
  const elem = document.createElement('div');
  const shortLinkBtnText = 'Get short link';
  const newLinkBtnText = 'Get a new link';
  const getImageLinkBtnText = 'Get image';

  if (savedUrl) {
    url = savedUrl.split('?u=')[1];
  }

  elem.innerHTML = `
  <div id = "header-link">Creating a link</div>
  <div><input readonly class="share-input" /></div>
  <img class="map-image img"/>
  <input type="checkbox" id="checkbox-style"/>
  <label for="checkbox-style" id="checkbox-style-label">Save the style information</label>
  <input type="checkbox" id="checkbox-param-map"/>
  <label for="checkbox-param-map" id="checkbox-param-map-label">Save the map parameters</label>
  <div class="buttons-panel">
  <button class="get-short-link button" style="user-select: none">${shortLinkBtnText}</button>
  <button class="copy-url button" style="user-select: none">Copy URL</button>
  <button class="get-image-link button" style="display: none" >${getImageLinkBtnText}</button>
  </div>
  <div class="error-block hidden">
    <span class="error-block-title">ERROR: </span><span class="error-block-detail"></span>
  </div>
  `;
  const checkboxParam = elem.querySelector(
    '#checkbox-param-map',
  ) as HTMLInputElement;

  const header = elem.querySelector('#header-link') as HTMLDivElement;
  header.style.userSelect = 'none';
  header.style.marginBottom = '30px';
  header.style.display = 'flex';
  header.style.justifyContent = 'center';
  header.style.fontSize = '18px';
  header.style.fontWeight = 'bold';

  const checkboxStyle = elem.querySelector(
    '#checkbox-style',
  ) as HTMLInputElement;
  checkboxStyle.style.userSelect = 'none';
  checkboxStyle.style.marginTop = '20px';
  checkboxStyle.style.marginLeft = '0px';
  checkboxStyle.style.paddingRight = '0';
  const checkboxStyle_label = elem.querySelector(
    '#checkbox-style-label',
  ) as HTMLDivElement;
  checkboxStyle_label.style.userSelect = 'none';

  const shareInput = elem.querySelector('.share-input') as HTMLInputElement;
  const getShortLinkBtn = elem.querySelector(
    '.get-short-link',
  ) as HTMLButtonElement;
  const getImageBtn = elem.querySelector(
    '.get-image-link',
  ) as HTMLButtonElement;
  const copyUrl = elem.querySelector('.copy-url') as HTMLButtonElement;
  const shareErrorBlock = elem.querySelector('.error-block') as HTMLDivElement;
  const shareErrorBlockDetail = elem.querySelector(
    '.error-block-detail',
  ) as HTMLElement;

  copyUrl.style.width = '90px';
  copyUrl.disabled = true;

  const setUrl = (u: string) => {
    const params: string[] = [];

    params.push(`u=${u}`);

    for (const [key, value] of Object.entries(state.state)) {
      const str = state.getString(key as keyof MapConfig);
      if (value.urlName && str) {
        const shareStyle = checkboxStyle.checked && value.forShare === 'style';
        const shareMap = checkboxParam.checked && value.forShare === 'map';
        if (shareStyle || shareMap) {
          params.push(`${value.urlName}=${encodeURIComponent(str)}`);
        }
      }
    }

    const fullUrl = `${location.origin}?${params.join('&')}`;
    history.replaceState(null, '', fullUrl);

    shareInput.value = fullUrl;
    savedUrl = fullUrl;
    copyUrl.disabled = false;

    if (shareInput.value) {
      getShortLinkBtn.innerHTML = newLinkBtnText;
    }
  };

  if (url) {
    setUrl(url);
  }

  const updateCheckboxState = () => {
    if (!savedUrl) return;
    // TODO: use urlRuntime.set instead of URL
    const urlObj = new URL(savedUrl, location.origin);
    const params = urlObj.searchParams;

    checkboxStyle.checked =
      params.has('color') &&
      params.has('opacity') &&
      params.has('strokeColor') &&
      params.has('strokeOpacity');

    checkboxParam.checked = params.has('bbox');
  };

  const updateUrlParams = () => {
    if (!savedUrl) return;
    // TODO: use urlRuntime.set instead of URL
    const urlParams = new URL(savedUrl, location.origin).searchParams;
    const currentU = urlParams.get('u') || '';

    setUrl(currentU);
  };

  checkboxStyle.addEventListener('change', updateUrlParams);
  checkboxParam.addEventListener('change', updateUrlParams);

  updateCheckboxState();

  const startLoading = (btn: HTMLButtonElement) => {
    btn.disabled = true;
    btn.innerHTML = 'Loading...';
  };
  const updateButtonState = (
    btn: HTMLButtonElement,
    success: boolean,
    message: string,
  ) => {
    btn.classList.toggle('success', success);
    btn.classList.toggle('error', !success);
    btn.innerHTML = message;
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('success', 'error');
      btn.innerHTML = success ? newLinkBtnText : shortLinkBtnText;
      btn.disabled = false;
    }, 1000);
  };

  const showShareError = (message: string) => {
    shareErrorBlockDetail.innerHTML = message;
    toggleBlock(shareErrorBlock, true);
  };

  copyUrl.onclick = () => {
    if (Clipboard.copy(shareInput.value)) {
      copyUrl.innerHTML = 'Copied';
      setTimeout(() => {
        copyUrl.innerHTML = 'Copy URL';
      }, 1000);
    }
  };

  getShortLinkBtn.onclick = async () => {
    startLoading(getShortLinkBtn);
    try {
      savedUrl = null;
      const response = await fetch('/create-link', {
        method: 'POST',
        body: JSON.stringify(geojson),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      checkboxStyle.addEventListener('change', () => {
        urlRuntime.set('u', data.keyname);
        setUrl(data.keyname);
      });
      checkboxParam.addEventListener('change', () => {
        urlRuntime.set('u', data.keyname);
        setUrl(data.keyname);
      });
      if (response.status === 201) {
        updateButtonState(getShortLinkBtn, true, newLinkBtnText);
        urlRuntime.set('u', data.keyname);
        setUrl(data.keyname);
      } else {
        showShareError(data.error || 'Link creation error');
        updateButtonState(getShortLinkBtn, false, shortLinkBtnText);
      }
    } catch {
      showShareError('Error creating link');
      updateButtonState(getShortLinkBtn, false, shortLinkBtnText);
    }
  };

  getImageBtn.onclick = async () => {
    try {
      const response = await fetch(`/img?u=${url}&width=${400}&height=${200}`);
      if (response.ok) {
        const blob = await response.blob();
        const mapImageUrl = URL.createObjectURL(blob);
        const mapImage = elem.querySelector('.map-image') as HTMLImageElement;
        mapImage.setAttribute('src', mapImageUrl);
      } else {
        throw new Error('Image loading error');
      }
    } catch (err) {
      console.error('Error:', (err as Error).message);
    }
  };

  return elem;
}
