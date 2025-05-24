import rulerIcon from '../images/ruler';
import { state } from '../state';
import { makeIcon } from '../utils/makeIcon';

import { getRoundNum } from './utils';

import type NgwMap from '@nextgis/ngw-maplibre-gl';

import './scalebar-control.css';

export class SidebarControl {
  private readonly ngwMap: NgwMap;
  private scaleBarElement?: HTMLElement;

  private updateScaleBind?: () => void;

  constructor({ ngwMap }: { ngwMap: NgwMap }) {
    this.ngwMap = ngwMap;
    this.addToggler();
    this.createScaleBar();
  }

  private addToggler() {
    const status = state.getVal('scale');

    const toggler = this.ngwMap.createToggleControl({
      html: {
        on: makeIcon(rulerIcon, { width: 512, height: 512 }),
        off: makeIcon(rulerIcon, { width: 512, height: 512 }),
      },
      addClassOff: 'scale-bar-disable',
      status,
      onClick: () => {
        state.set('scale', !state.getVal('scale'));
      },
    });

    this.ngwMap.addControl(toggler, 'top-left');
  }

  private createScaleBar() {
    const scaleBarControl = this.ngwMap.createControl(
      {
        onAdd: () => {
          const map = this.ngwMap;

          const scaleBarElement = document.createElement('div');

          this.updateScaleBind = this.updateScale.bind(this);

          map.emitter.on('move', this.updateScaleBind);
          map.emitter.on('zoom', this.updateScaleBind);

          this.scaleBarElement = scaleBarElement;
          this.updateScale();
          return scaleBarElement;
        },

        onRemove: () => {
          const map = this.ngwMap;
          if (this.updateScaleBind) {
            map.emitter.off('move', this.updateScaleBind);
            map.emitter.off('zoom', this.updateScaleBind);
          }
          this.scaleBarElement = undefined;
          this.updateScaleBind = undefined;
        },
      },
      { margin: true },
    );

    const toggleScaleBar = (shown: boolean) => {
      if (shown && !this.scaleBarElement) {
        this.ngwMap.addControl(scaleBarControl, 'bottom-left');
      } else if (!shown && this.scaleBarElement) {
        this.ngwMap.removeControl(scaleBarControl);
      }
    };

    state.subscribe((currentState) => {
      toggleScaleBar(currentState.scale?.value || false);
    });
    toggleScaleBar(state.getVal('scale') || false);
  }

  private updateScale() {
    const scaleElement = this.scaleBarElement;
    const map = this.ngwMap;
    if (!scaleElement) return;

    const scaleWidthPx = 100;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (zoom !== undefined && center) {
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((center[1] * Math.PI) / 180))) /
        (Math.pow(2, zoom) * 256);
      const maxMeters = scaleWidthPx * metersPerPixel;

      const distance = getRoundNum(maxMeters);
      const ratio = distance / maxMeters;
      const finalWidthPx = scaleWidthPx * ratio;

      let displayValue, unit;
      if (distance >= 1000) {
        displayValue = (distance / 1000).toFixed(0);
        unit = 'km';
      } else {
        displayValue = distance.toFixed(0);
        unit = 'm';
      }

      scaleElement.innerHTML = `
            <div style="display: flex; width: ${finalWidthPx}px; height: 7px; margin-bottom: 3px; border: 1px solid #000;">
                <div style="flex: 1; background: black;"></div>
                <div style="flex: 1; background: white;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; width: ${finalWidthPx}px; font-size: 10px; white-space: nowrap;">
                <span>0</span>
                <span style="position: relative; left: 12px;">${displayValue} ${unit}</span>
            </div>
          `;
    }
  }
}
