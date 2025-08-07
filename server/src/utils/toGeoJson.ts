import { parseGeoJson } from './parseGeoJson';
import { parse } from 'wellknown';
import type { GeoJSON } from 'geojson';

export function toGeoJson(str: string): GeoJSON | false {
  const geojson = parseGeoJson(str);
  if (geojson) {
    return geojson;
  }
  try {
    return parse(str);
  } catch {
    return false;
  }
}
