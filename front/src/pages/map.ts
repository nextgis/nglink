import { mdiRefresh, mdiShare } from '@mdi/js';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-maplibre-gl';
import Color from 'color';

import { showInput, urlRuntime } from '../common';
import { appBlock, dataInput } from '../pages/home';
import { state } from '../state';
import { toggleBlock } from '../utils/dom';
import { makeIcon } from '../utils/makeIcon';

import { createShareContent } from './share';

import type { PathPaint } from '@nextgis/paint';
import type { FitOptions } from '@nextgis/webmap';
import type { GeoJSON } from 'geojson';

export const mapBlock = document.getElementById('map') as HTMLElement;

const qmsId = state.getVal('qmsId');
const opacityInit = state.getVal('opacity');

const padding = state.getVal('fitPadding');
const maxZoom = state.getVal('fitMaxZoom');

export let ngwMap: NgwMap | undefined;

export function showMap(geojson: GeoJSON, url?: string, link = false) {
  toggleBlock(appBlock, false);
  toggleBlock(mapBlock, true);

  const bbox = state.getVal('bbox');

  NgwMap.create({
    target: mapBlock,
    qmsId,
    osm: !qmsId ? true : undefined,
    bounds: bbox,
  }).then((ngwMap_) => {
    ngwMap = ngwMap_;

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

    ngwMap
      .addGeoJsonLayer({
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
      })
      .then((layer) => {
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
      });

    const paintControl = ngwMap.createControl(
      {
        onAdd: () => {
          const elem = document.createElement('div');
          elem.innerHTML = `
          <div id="style-control">
            <div class="color-control">
                <input class="fill-color-select" type="color" />
                <input class="alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label for="fill-color-select">Fill color</label>
            </div>
            <div class="color-control">
                <input class="stroke-color-select" type="color" />
                <input class="stroke-alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label for="stroke-color-select">Stroke color</label>
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

          const labels = elem.querySelectorAll(
            'label',
          ) as NodeListOf<HTMLLabelElement>;
          labels.forEach((label) => {
            label.style.fontSize = '16px';
            label.style.fontWeight = 'bold';
            label.style.cursor = 'pointer';
            label.style.marginLeft = '10px';
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

          fillColorSelect.oninput = () => {
            state.set('color', fillColorSelect.value);
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
}
