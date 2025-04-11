export interface MapConfig {
  opacity?: number;
  color?: string;
  strokeOpacity?: number;
  strokeColor?: string;
  url?: string;
  qmsId?: number;
  bbox?: number[] | [number, number, number, number];
  fitOffset?: [number, number];
  fitPadding?: number;
  fitMaxZoom?: number;
}
