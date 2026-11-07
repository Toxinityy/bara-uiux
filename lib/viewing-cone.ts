/** Illustrative footprint only: neither measured camera FOV nor fire distance. */
export const VIEW_ANGLE = 60;
export const VIEW_DISTANCE = 45;
const radians = Math.PI / 180;

/** GeoJSON ring in longitude/latitude order; headings are clockwise from assumed north. */
export function viewingCone(latitude: number, longitude: number, heading: number): [number, number][] {
  if (![latitude, longitude, heading].every(Number.isFinite) || Math.abs(latitude) > 85.05112878
    || Math.abs(longitude) > 180 || heading < 0 || heading >= 360) return [];
  const originLat = latitude * radians;
  const originLng = longitude * radians;
  const distance = VIEW_DISTANCE / 6371000;
  const points: [number, number][] = [[longitude, latitude]];
  for (let offset = -VIEW_ANGLE / 2; offset <= VIEW_ANGLE / 2; offset += 3) {
    const bearing = (heading + offset) * radians;
    const lat = Math.asin(Math.sin(originLat) * Math.cos(distance)
      + Math.cos(originLat) * Math.sin(distance) * Math.cos(bearing));
    const lng = originLng + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(originLat),
      Math.cos(distance) - Math.sin(originLat) * Math.sin(lat));
    // Keep longitude continuous around the origin when crossing the date line.
    points.push([lng / radians, lat / radians]);
  }
  points.push([longitude, latitude]);
  return points;
}
