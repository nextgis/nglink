import { mdiRefresh, mdiShare } from '@mdi/js';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-maplibre-gl';
import UrlRuntimeParams from '@nextgis/url-runtime-params';
import { Clipboard, debounce } from '@nextgis/utils';
import Color from 'color';

import { makeIcon } from './utils/makeIcon';

import type { ApiError } from './interfaces';
import type { FitOptions } from '@nextgis/webmap';
import type { GeoJSON } from 'geojson';

const loadingBlock = document.getElementById('loading-block') as HTMLElement;
const inputBlock = document.getElementById('input-block') as HTMLElement;
const dataInput = document.getElementById('data-input') as HTMLInputElement;
const showDataBtn = document.getElementById(
  'show-data-btn',
) as HTMLButtonElement;
const errorBlock = document.getElementById('error-block') as HTMLElement;
const errorBlockDetail = document.getElementById(
  'error-block-detail',
) as HTMLElement;
const mapBlock = document.getElementById('map') as HTMLElement;
const appBlock = document.getElementById('app') as HTMLElement;
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropArea = document.getElementById('drop-area') as HTMLElement;

const urlRuntime = new UrlRuntimeParams();
const url = urlRuntime.get('u');
const colorInit = `${urlRuntime.get('color') || 'blue'}`;
const qmsIdStr = urlRuntime.get('qmsid');
const qmsId = qmsIdStr ? Number(qmsIdStr) : undefined;
const bboxStr = urlRuntime.get('bbox');

let bbox: number[] | undefined = undefined;
if (bboxStr) {
  bbox = bboxStr.split(',').map(Number);
}

const fitOffsetStr = urlRuntime.get('fitoffset');
let offset: [number, number] | undefined = undefined;

if (fitOffsetStr) {
  const offsetArray = fitOffsetStr.split(',').map(Number);
  if (offsetArray.length) {
    if (offsetArray.length === 1) {
      const size = offsetArray[0];
      offset = [size, size];
    } else {
      const [width, height] = offsetArray;
      offset = [width, height];
    }
  }
}

const fitPaddingStr = urlRuntime.get('fitpadding');
const padding: number | undefined = fitPaddingStr
  ? Number(fitPaddingStr)
  : undefined;

const fitMaxZoomStr = urlRuntime.get('fitmaxzoom');
const maxZoom: number | undefined = fitMaxZoomStr
  ? Number(fitMaxZoomStr)
  : undefined;

let ngwMap: NgwMap | undefined;

if (url) {
  fetchData(url);
} else {
  showInput();
  showDataBtn.addEventListener('click', () => {
    const val = dataInput.value;
    if (val) {
      fetchData(val);
    }
  });
}

function toggleBlock(el: HTMLElement, show: boolean) {
  el.classList.toggle('hidden', !show);
}
function showInput() {
  if (ngwMap) ngwMap.destroy();
  urlRuntime.remove('u');
  toggleBlock(mapBlock, false);
  toggleBlock(appBlock, true);
  toggleBlock(inputBlock, true);
}
function showLoading() {
  toggleBlock(inputBlock, false);
  toggleBlock(appBlock, true);
  toggleBlock(loadingBlock, true);
}
function hideLoading() {
  toggleBlock(loadingBlock, false);
}
function showError(er: ApiError) {
  errorBlockDetail.innerHTML = er.error || '';
  toggleBlock(errorBlock, true);
}
function hideError() {
  errorBlockDetail.innerHTML = '';
  toggleBlock(errorBlock, false);
}

// test url https://data.nextgis.com/order/d6edd701/geometry
async function fetchData(url: string) {
  showLoading();
  try {
    const response = await fetch('/d?u=' + encodeURIComponent(url));
    const data = await response.json();
    if (response.ok) {
      hideLoading();
      if (data.geojson) {
        showMap(data.geojson, url, data.link);
      } else {
        throw new Error('No GeoJSON data');
      }
    } else {
      showInput();
      showError(data);
    }
  } catch (error) {
    showInput();
    showError({ error: 'Unable to fetch data' });
  }
}

// Show map function
function showMap(geojson: GeoJSON, url?: string, link = false) {
  toggleBlock(appBlock, false);
  toggleBlock(mapBlock, true);

  NgwMap.create({
    target: mapBlock,
    qmsId,
    osm: !qmsId ? true : undefined,
    bounds: bbox,
  }).then((ngwMap_) => {
    ngwMap = ngwMap_;
    if (url) {
      urlRuntime.set('u', url);
    }
    ngwMap.addControl('BUTTON', 'top-left', {
      html: makeIcon(mdiRefresh),
      title: 'Refresh',
      onClick: () => {
        dataInput.value = '';
        showInput();
      },
    });

    ngwMap.addControl('BUTTON', 'top-left', {
      html: makeIcon(mdiShare),
      title: 'Share URL',
      onClick: () => {
        const dialog = new Dialog();
        dialog.updateContent(createShareContent(geojson, url, link));
        dialog.show();
      },
    });

    ngwMap
      .addGeoJsonLayer({
        data: JSON.parse(JSON.stringify(geojson)),
        id: 'layer',
        paint: { color: colorInit },
        selectedPaint: {
          color: 'orange',
          fillOpacity: 0.8,
          strokeOpacity: 1,
        },
        selectable: true,
        popupOnSelect: true,
        popupOptions: {
          createPopupContent: (e) => {
            const element = document.createElement('table');
            const properties = e.feature.properties || {};
            element.innerHTML = '<tbody>';
            Object.entries(properties).forEach(([key, value]) => {
              element.innerHTML += `<tr><th>${key}</th><td>${value}</td></tr>`;
            });
            element.innerHTML += '</tbody>';
            return element;
          },
        },
      })
      .then((layer) => {
        if (!bbox) {
          const fitOptions: FitOptions = {};
          if (offset) {
            fitOptions.offset = offset;
          }
          if (padding !== undefined) {
            fitOptions.padding = padding;
          }
          if (maxZoom !== undefined) {
            fitOptions.maxZoom = maxZoom;
          }

          ngwMap?.fitLayer(layer, fitOptions);
        }
      });

    const paintControl = ngwMap.createControl(
      {
        onAdd: () => {
          const elem = document.createElement('div');
          elem.innerHTML = `
          <div class="">
            <input id="fill-color-select" type="color" />
            <label for="fill-color-select">Fill color</label>
          </div>
          `;
          const fillColorSelect = elem.querySelector(
            '#fill-color-select',
          ) as HTMLInputElement;
          fillColorSelect.value = Color(colorInit).hex();
          const updatePaint = debounce(() => {
            ngwMap?.updateLayerPaint('layer', {
              fillColor: fillColorSelect.value,
            });
          }, 300);
          fillColorSelect.oninput = updatePaint;
          return elem;
        },
        onRemove: () => null,
      },
      { bar: true, addClass: 'paint-control' },
    );

    ngwMap.addControl(paintControl, 'top-right');
  });
}

function createShareContent(geojson: GeoJSON, url?: string, link = false) {
  const elem = document.createElement('div');
  const shortLinkBtnText = 'Get short link';
  const getImageLinkBtnText = 'Get image';
  elem.innerHTML = `
  <div><input readonly class="share-input" /></div>
  <img class="map-image img"/>
  <div class="buttons-panel">
  <button class="get-short-link button">${shortLinkBtnText}</button>
  <button class="copy-url button">Copy URL</button>
  <button class="get-image-link button" style="display: none">${getImageLinkBtnText}</button>
  </div>
  <div class="error-block hidden">
    <span class="error-block-title">ERROR: </span><span class="error-block-detail"></span>
  </div>
  `;

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

  const setUrl = (u: string) => {
    shareInput.value = `${location.origin}?u=${u}`;
  };
  if (url) setUrl(url);
  if (link) getShortLinkBtn.style.display = 'none';

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
      btn.innerHTML = success ? 'Link created' : shortLinkBtnText;
      btn.disabled = false;
    }, 1000);
  };

  const showShareError = (message: string) => {
    shareErrorBlockDetail.innerHTML = message;
    toggleBlock(shareErrorBlock, true);
  };

  copyUrl.onclick = () => {
    if (Clipboard.copy(shareInput.value)) {
      copyUrl.classList.add('success');
      setTimeout(() => copyUrl.classList.remove('success'), 500);
    }
  };

  getShortLinkBtn.onclick = async () => {
    startLoading(getShortLinkBtn);
    try {
      const response = await fetch('/create-link', {
        method: 'POST',
        body: JSON.stringify(geojson),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (response.status === 201) {
        updateButtonState(getShortLinkBtn, true, 'Link created');
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

['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) =>
  dropArea.addEventListener(eventName, preventDefaults, false),
);
['dragenter', 'dragover'].forEach((eventName) =>
  dropArea.addEventListener(eventName, () => highlight(dropArea), false),
);
['dragleave', 'drop'].forEach((eventName) =>
  dropArea.addEventListener(eventName, () => unhighlight(dropArea), false),
);
dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', onFileChange, false);

function handleDrop(e: DragEvent) {
  hideError();
  const dt = e.dataTransfer;
  if (dt && dt.files.length) {
    handleFile(dt.files[0]);
  }
}
function onFileChange(e: Event) {
  hideError();
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length) {
    handleFile(files[0]);
  }
}
function handleFile(file: File) {
  const reader = new FileReader();
  showLoading();
  reader.onload = (event) => {
    const result = event.target?.result;
    if (result && typeof result === 'string') {
      try {
        const geojson = JSON.parse(result) as GeoJSON;
        showMap(geojson);
      } catch {
        showError({ error: 'File is not valid GeoJSON' });
      }
    }
    hideLoading();
  };
  reader.onerror = () => {
    hideLoading();
    showError({ error: 'Read file error' });
  };
  reader.readAsText(file);
}

function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}
function highlight(el: HTMLElement) {
  el.classList.add('highlight');
}
function unhighlight(el: HTMLElement) {
  el.classList.remove('highlight');
}
