import { mdiRefresh, mdiShare } from '@mdi/js';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-mapbox';
import UrlRuntimeParams from '@nextgis/url-runtime-params';
import { Clipboard, debounce } from '@nextgis/utils';
import Color from 'color';

import { makeIcon } from './utils/makeIcon';

import type { ApiError } from './interfaces';
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

function hideBlock(el: HTMLElement) {
  el.classList.add('hidden');
}
function showBlock(el: HTMLElement) {
  el.classList.remove('hidden');
}

function showInput() {
  if (ngwMap) {
    ngwMap.destroy();
  }
  urlRuntime.remove('u');
  hideLoading();
  hideError();
  hideBlock(mapBlock);
  showBlock(appBlock);
  showBlock(inputBlock);
}

function showLoading() {
  hideBlock(inputBlock);
  hideError();
  showBlock(appBlock);
  showBlock(loadingBlock);
}

function hideLoading() {
  hideBlock(loadingBlock);
}

function showError(er: ApiError) {
  if (er.error) {
    errorBlockDetail.innerHTML = er.error;
  }
  showBlock(errorBlock);
}

function hideError() {
  errorBlockDetail.innerHTML = '';
  hideBlock(errorBlock);
}

// test url https://data.nextgis.com/order/d6edd701/geometry
function fetchData(url: string) {
  showLoading();
  fetch('/d?u=' + encodeURI(url))
    .then((resp) => {
      resp.json().then((data) => {
        if (resp.status === 200) {
          hideLoading();
          if (data.geojson) {
            showMap(data.geojson, url, data.link);
          } else {
            throw new Error();
          }
        } else {
          showInput();
          showError(data);
        }
      });
    })
    .catch((er: ApiError) => {
      showInput();
      showError(er);
    });
}

function showMap(geojson: GeoJSON, url?: string, link = false) {
  hideBlock(appBlock);
  showBlock(mapBlock);
  NgwMap.create({
    target: mapBlock,
    osm: true,
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
        // @ts-ignore
        const dialog = new Dialog();
        dialog.updateContent(createShareContent(geojson, url, link));
        dialog.show();
      },
    });

    ngwMap.addGeoJsonLayer({
      data: JSON.parse(JSON.stringify(geojson)),
      fit: true,
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

          element.innerHTML = '<tbody>';
          Object.entries(e.feature.properties as any).forEach(
            ([key, value]) => {
              element.innerHTML +=
                '<tr><th>' + key + '</th><td>' + value + '</td></tr>';
            },
          );
          element.innerHTML += '</tbody>';
          return element;
        },
      },
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
            if (ngwMap) {
              ngwMap.updateLayerPaint('layer', {
                fillColor: fillColorSelect.value,
              });
            }
          }, 300);

          fillColorSelect.oninput = () => {
            updatePaint();
          };

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
  <button class="get-image-link button">${getImageLinkBtnText}</button>
  </div>

  <div class="error-block hidden" >
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
  const shareErrorBlock = elem.querySelector(
    '.error-block',
  ) as HTMLButtonElement;
  const shareErrorBlockDetail = elem.querySelector(
    '.error-block-detail',
  ) as HTMLButtonElement;

  const setUrl = (u: string) => {
    shareInput.value = `${location.origin}?u=${u}`;
  };

  if (url) {
    setUrl(url);
  }

  if (link) {
    getShortLinkBtn.style.display = 'none';
  }

  const startLoading = () => {
    hideBlock(shareErrorBlock);
    getShortLinkBtn.innerHTML = 'Loading...';
    getShortLinkBtn.disabled = true;
  };
  const onSuccess = () => {
    hideBlock(shareErrorBlock);
    getShortLinkBtn.innerHTML = 'Link created';
    getShortLinkBtn.classList.remove('error');
    getShortLinkBtn.classList.add('success');
    getShortLinkBtn.disabled = true;
  };
  const onError = (er = '') => {
    getShortLinkBtn.innerHTML = 'Link creation error';
    getShortLinkBtn.classList.remove('success');
    getShortLinkBtn.classList.add('error');
    getShortLinkBtn.disabled = true;
    showBlock(shareErrorBlock);
    shareErrorBlockDetail.innerHTML = er;
    setTimeout(() => {
      getShortLinkBtn.innerHTML = shortLinkBtnText;
      getShortLinkBtn.classList.remove('error');
      getShortLinkBtn.disabled = false;
    }, 500);
  };

  copyUrl.onclick = () => {
    if (Clipboard.copy(shareInput.value)) {
      copyUrl.classList.add('success');
      setTimeout(() => {
        copyUrl.classList.remove('success');
      }, 500);
    }
  };
  getShortLinkBtn.onclick = () => {
    startLoading();
    fetch('/create-link', {
      method: 'POST',
      body: JSON.stringify(geojson),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((resp) => {
        resp.json().then((data) => {
          if (resp.status === 201) {
            onSuccess();
            urlRuntime.set('u', data.keyname);
            setUrl(data.keyname);
          } else {
            onError(data.error);
          }
        });
      })
      .catch((er) => {
        onError(er.error);
      });
  };
  getImageBtn.onclick = () => {
    fetch(`/img?u=${url}&width=${400}&height=${200}`)
      .then((resp) => {
        if (resp.ok) {
          return resp.blob();
        }
        throw new Error('Image loading error');
      })
      .then((blob) => {
        const mapImageUrl = URL.createObjectURL(blob);

        const mapImage = elem.querySelector('.map-image');
        if (mapImage) {
          mapImage.setAttribute('src', mapImageUrl);
        }
      })
      .catch((err) => {
        console.error('Error:', err.message);
      });
  };

  return elem;
}

for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  dropArea.addEventListener(eventName, preventDefaults, false);
}
for (const eventName of ['dragenter', 'dragover']) {
  dropArea.addEventListener(eventName, highlight, false);
}
for (const eventName of ['dragleave', 'drop']) {
  dropArea.addEventListener(eventName, unhighlight, false);
}

dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', onFileChange, false);

function handleDrop(e: DragEvent) {
  hideError();
  const dt = e.dataTransfer;
  if (dt) {
    const file = dt.files[0];
    if (file) {
      handleFile(file);
    }
  }
}
function onFileChange(e: Event) {
  hideError();
  console.log(e);
  const files = (e.target as HTMLInputElement).files;
  if (files) {
    const file = files[0];
    handleFile(file);
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
function highlight(e: Event) {
  dropArea.classList.add('highlight');
}
function unhighlight(e: Event) {
  dropArea.classList.remove('highlight');
}
