import './style.css';
import UrlRuntimeParams from '@nextgis/url-runtime-params';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-mapbox';

import type { GeoJSON } from 'geojson';

const loadingBlock = document.getElementById('loading-block') as HTMLElement;
const inputBlock = document.getElementById('input-block') as HTMLElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const showDataBtn = document.getElementById(
  'show-data-btn',
) as HTMLButtonElement;
const errorBlock = document.getElementById('error-block') as HTMLElement;
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
    const val = urlInput.value;
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
  hide(loadingBlock);
  hide(mapBlock);
  show(appBlock);
  show(inputBlock);
}

function showLoading() {
  hide(inputBlock);
  hide(errorBlock);
  show(appBlock);
  show(loadingBlock);
}

function fetchData(url: string) {
  showLoading();
  fetch('/d?u=' + encodeURI(url))
    .then((resp) => {
      if (resp.status === 200) {
        resp.json().then((data) => {
          hide(loadingBlock);
          if (data.geojson) {
            showMap(data.geojson, url);
          } else {
            throw new Error();
          }
        });
      } else {
        throw new Error();
      }
    })
    .catch(() => {
      show(errorBlock);
      showInput();
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
        urlInput.value = '';
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
