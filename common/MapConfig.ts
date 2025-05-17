import type { LngLatBoundsArray } from '@nextgis/utils';

export interface MapConfig {
  opacity?: number;
  color?: string;
  strokeOpacity?: number;
  strokeColor?: string;
  weight?: string;
  url?: string;
  qmsId?: number;
  bbox?: LngLatBoundsArray;
  fitOffset?: [number, number];
  fitPadding?: number;
  fitMaxZoom?: number;
  scale?: boolean;
}
