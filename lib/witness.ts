type HeadingReading = {
  alpha?: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

export function compassHeading(reading: HeadingReading): number | null {
  if (Number.isFinite(reading.webkitCompassHeading)) {
    if ((reading.webkitCompassAccuracy ?? 0) < 0) return null;
    return ((reading.webkitCompassHeading! % 360) + 360) % 360;
  }
  if (reading.absolute && typeof reading.alpha === 'number' && Number.isFinite(reading.alpha)) {
    return ((360 - reading.alpha) % 360 + 360) % 360;
  }
  return null;
}

export function captureBlock(camera: boolean, location: boolean, heading: boolean, online: boolean) {
  if (!camera) return 'Open the camera to begin setup.';
  if (!location) return 'Enable location in Controls to add your position.';
  if (!heading) return 'Start the compass in Controls to add direction.';
  if (!online) return 'You are offline. Submission is unavailable.';
  return 'UI preview — photo submission is not connected.';
}
