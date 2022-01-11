import './style.css';

import UrlRuntimeParams from '@nextgis/url-runtime-params';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-mapbox';

import type { GeoJSON } from 'geojson';
import { ApiError } from './interfaces';

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

const urlRuntime = new UrlRuntimeParams();
const url = urlRuntime.get('u');

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

function hide(el: HTMLElement) {
  el.classList.add('hidden');
}
function show(el: HTMLElement) {
  el.classList.remove('hidden');
}

function showInput() {
  if (ngwMap) {
    ngwMap.destroy();
  }
  urlRuntime.remove('u');
  hideLoading();
  hideError();
  hide(mapBlock);
  show(appBlock);
  show(inputBlock);
}

function showLoading() {
  hide(inputBlock);
  hideError();
  show(appBlock);
  show(loadingBlock);
}

function hideLoading() {
  hide(loadingBlock);
}

function showError(er: ApiError) {
  if (er.error) {
    errorBlockDetail.innerHTML = er.error;
  }
  show(errorBlock);
}

function hideError() {
  errorBlockDetail.innerHTML = '';
  hide(errorBlock);
}

function fetchData(url: string) {
  showLoading();
  fetch('/d?u=' + encodeURI(url))
    .then((resp) => {
      resp.json().then((data) => {
        if (resp.status === 200) {
          hideLoading();
          if (data.geojson) {
            showMap(data.geojson, url);
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

function showMap(geojson: GeoJSON, url: string) {
  show(mapBlock);
  hide(appBlock);
  NgwMap.create({
    target: mapBlock,
    osm: true,
  }).then((ngwMap_) => {
    ngwMap = ngwMap_;
    urlRuntime.set('u', url);
    ngwMap.addControl('BUTTON', 'top-left', {
      html: 'U',
      title: 'Insert new URL',
      onClick: () => {
        dataInput.value = '';
        showInput();
      },
    });

    ngwMap.addControl('BUTTON', 'top-left', {
      html: 'S',
      title: 'Share URL',
      onClick: () => {
        // @ts-ignore
        const dialog = new Dialog();
        dialog.updateContent(`${location.origin}?u=${url}`);
        dialog.show();
      },
    });

    ngwMap.addGeoJsonLayer({
      data: geojson,
      fit: true,
      paint: { color: 'blue' },
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
          Object.entries(e.feature.properties).forEach(([key, value]) => {
            element.innerHTML +=
              '<tr><th>' + key + '</th><td>' + value + '</td></tr>';
          });
          element.innerHTML += '</tbody>';
          return element;
        },
      },
    });
  });
}
