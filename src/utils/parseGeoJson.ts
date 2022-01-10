import type { GeoJSON } from 'geojson';

export function parseGeoJson(val: unknown): GeoJSON | false {
  try {
    const json =
      typeof val === 'object'
        ? val
        : typeof val === 'string'
        ? JSON.parse(val)
        : {};
    if ('type' in json) {
      return json;
    }
  } catch {
    return false;
  }
  return false;
}
