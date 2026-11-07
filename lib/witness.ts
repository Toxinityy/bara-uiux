type HeadingReading = {
  alpha?: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

const topics = [
  { key: 'visible_flames', name: 'Visible flames', description: 'Whether identifiable flames are visible.' },
  { key: 'smoke_visibility_color_origin', name: 'Visible smoke', description: 'Smoke visibility, color, and apparent source.' },
  { key: 'forest_woodland_fire', name: 'Forest or woodland fire', description: 'Visible evidence of fire involving forest or woodland.' },
  { key: 'visibly_burning_material', name: 'What is burning', description: 'The visible material or object involved.' },
  { key: 'fire_suppression', name: 'Firefighting activity', description: 'Visible response activity and supported actor roles.' },
];

export function witnessTopics(checklist?: { items: { criterionKey: string; criterionName: string; status: string }[] }) {
  const items = checklist?.items ?? [];
  const definitions = [...topics, ...items.filter(item => item.criterionKey !== 'camera_to_fire_distance' && !topics.some(topic => topic.key === item.criterionKey))
    .map(item => ({ key: item.criterionKey, name: item.criterionName, description: item.criterionName }))];
  return definitions.map(topic => {
    const item = items.find(item => item.criterionKey === topic.key);
    const confirmed = item?.status === 'resolved';
    const label = confirmed ? 'Confirmed' : item?.status === 'uncertain' ? 'Needs information' : item?.status === 'unavailable' ? 'Assessment unavailable' : 'Not assessed';
    return { ...topic, confirmed, label };
  });
}

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

export function captureBlock(camera: boolean, location: boolean, heading: boolean, online: boolean, session = false, busy = false): string | null {
  if (busy) return 'Please wait for the current request to finish.';
  if (!session) return 'Open the camera to start a session.';
  if (!camera) return 'Open the camera to begin setup.';
  if (!location) return 'Waiting for location. Tap GPS to retry or enable it.';
  if (!heading) return 'Waiting for direction. Tap the compass to retry or enable it.';
  if (!online) return 'You are offline. Submission is unavailable.';
  return null;
}
