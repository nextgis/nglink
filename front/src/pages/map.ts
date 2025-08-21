import { mdiRefresh, mdiShare } from '@mdi/js';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-maplibre-gl';
import Color from 'color';

import { showInput, urlRuntime } from '../common';
import { SidebarControl } from '../map-controls/scalebar-control';
import { appBlock, dataInput } from '../pages/home';
import { state } from '../state';
import { toggleBlock } from '../utils/dom';
import { makeIcon } from '../utils/makeIcon';

import { createShareContent } from './share';

import type { PathPaint } from '@nextgis/paint';
import type { FitOptions } from '@nextgis/webmap';
import type { GeoJSON } from 'geojson';

import './map.css'

export const mapBlock = document.getElementById('map') as HTMLElement;

export let ngwMap: NgwMap | undefined;

export function showMap(geojson: GeoJSON, url?: string): Promise<void> {
  return new Promise((resolve) => {
    toggleBlock(appBlock, false);
    toggleBlock(mapBlock, true);

    const padding = state.getVal('fitPadding');
    const maxZoom = state.getVal('fitMaxZoom');
    const qmsId = state.getVal('qmsId');
    const opacityInit = state.getVal('opacity');

    const bbox = state.getVal('bbox');

    NgwMap.create({
      target: mapBlock,
      qmsId,
      osm: !qmsId ? true : undefined,
      bounds: bbox,
    }).then(async (ngwMap_) => {
      ngwMap = ngwMap_;

      const map = ngwMap.mapAdapter.map!;

      const waitForIdle = () =>
        new Promise<void>((done) => {
          if (map.loaded() && map.areTilesLoaded()) {
            done();
          } else {
            const checkIdle = () => {
              if (map.areTilesLoaded()) {
                map.off('idle', checkIdle);
                done();
              }
            };
            map.on('idle', checkIdle);
          }
        });

      const updateBboxState = () => {
        state.set('bbox', ngwMap?.getBounds());
      };
      ngwMap.emitter.on('moveend', updateBboxState);
      ngwMap.emitter.on('zoomend', updateBboxState);
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
          dialog.updateContent(createShareContent(geojson, url));
          dialog.show();
        },
      });

      const layer = await ngwMap.addGeoJsonLayer({
        data: JSON.parse(JSON.stringify(geojson)),
        id: 'layer',
        paint: {
          color: state.getVal('color'),
          fillOpacity: state.getVal('opacity'),
          strokeColor: state.getVal('strokeColor'),
          strokeOpacity: state.getVal('strokeOpacity'),
        },
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
      });

      if (!bbox) {
        const fitOptions: FitOptions = {};
        const offset = state.getVal('fitOffset');
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
      await waitForIdle();

      const paintControl = ngwMap.createControl(
        {
          onAdd: () => {
            const elem = document.createElement('div');
            elem.innerHTML = `
          <div id="style-control">
            <div class="color-control">
                <input class="fill-color-select" type="color" />
                <input class="alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label class="fill-color-label" for="fill-color-select">Fill color</label>
            </div>
            <div class="color-control">
                <input class="stroke-color-select" type="color" />
                <input class="stroke-alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label class="stroke-color-label" for="stroke-color-select">Stroke color</label>
            </div>
            <div class="weight">
                <input class="weight-select" type="number" min="0" max="10" step="0" value="1" />
                <label class="weight-label" for="weight-select">Weight</label>
            </div>
        </div>
          `;

            const containers = elem.querySelectorAll(
              '.color-control',
            ) as NodeListOf<HTMLDivElement>;
            containers.forEach((container) => {
              container.style.display = 'flex';
              container.style.alignItems = 'center';
              container.style.width = '207px';
              container.style.height = '35px';
              container.style.cursor = 'pointer';
              container.style.borderRadius = '4px';
            });

            const colorInputs = elem.querySelectorAll(
              '.fill-color-select, .stroke-color-select',
            ) as NodeListOf<HTMLInputElement>;
            colorInputs.forEach((colorInput) => {
              colorInput.style.width = '18%';
              colorInput.style.border = 'none';
              colorInput.style.background = '#fff';
              colorInput.style.margin = '0 7px';
              colorInput.style.cursor = 'pointer';
              colorInput.style.padding = '0';
            });

            const alphaInputs = elem.querySelectorAll(
              '.alpha-select, .stroke-alpha-select',
            ) as NodeListOf<HTMLInputElement>;
            alphaInputs.forEach((alphaInput) => {
              alphaInput.value = String(opacityInit);
              alphaInput.style.width = '40px';
              alphaInput.style.cursor = 'pointer';
              alphaInput.style.height = '2px';
            });

            const fillColorSelect = elem.querySelector(
              '.fill-color-select',
            ) as HTMLInputElement;
            fillColorSelect.value = Color(state.getVal('color')).hex();

            const alphaInput = elem.querySelector(
              '.alpha-select',
            ) as HTMLInputElement;
            alphaInput.value = String(state.getVal('opacity'));

            const strokeColorSelect = elem.querySelector(
              '.stroke-color-select',
            ) as HTMLInputElement;
            strokeColorSelect.value = Color(state.getVal('strokeColor')).hex();

            const strokeAlphaInput = elem.querySelector(
              '.stroke-alpha-select',
            ) as HTMLInputElement;
            strokeAlphaInput.value = String(state.getVal('strokeOpacity'));
            
            const weightInput = elem.querySelector(
              '.weight-select',
            ) as HTMLInputElement;
            weightInput.value = String(state.getVal('weight'));

            fillColorSelect.oninput = () => {
              state.set('color', fillColorSelect.value);
            };
            weightInput.oninput = () => {
              state.set('weight', Number(weightInput.value));
            };
            alphaInput.oninput = () => {
              state.set('opacity', Number(alphaInput.value));
            };
            strokeColorSelect.oninput = () => {
              state.set('strokeColor', strokeColorSelect.value);
            };
            strokeAlphaInput.oninput = () => {
              state.set('strokeOpacity', Number(strokeAlphaInput.value));
            };

            return elem;
          },
          onRemove: () => null,
        },
        { bar: true, addClass: 'paint-control' },
      );

      ngwMap.addControl(paintControl, 'top-right');

      new SidebarControl({ ngwMap });

      // Never delete this flag because it is used in generateImage for workaround
      // to make sure that ngwMap is initialized before making screenshot.
      window.mapLoaded = true;
      resolve();
    });

    state.subscribe((state) => {
      const paint = {} as PathPaint;

      for (const value of Object.values(state)) {
        if (value.paintName && value.value !== undefined) {
          paint[value.paintName as keyof PathPaint] = value.value as any;
        }
      }

      ngwMap?.updateLayerPaint('layer', paint);
    });
  });
}

// this is a workaround to make showMap available for generateImage
declare global {
  interface Window {
    showMap: typeof showMap;
    mapLoaded?: boolean;
  }
}
window.showMap = showMap;
