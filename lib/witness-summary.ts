import type { WitnessSession } from './witness-api';
import { witnessTopics } from './witness.ts';

export type SummaryTopic = {
  key: string;
  name: string;
  status: 'confirmed' | 'uncertain' | 'unavailable' | 'unassessed';
  finding: string;
  detail?: string;
};

type ChecklistItem = NonNullable<WitnessSession['checklist']>['items'][number];

const materialNames: Record<string, string> = {
  GRASS: 'grass', SHRUBS: 'shrubs', TREES: 'trees', BUILDINGS: 'buildings', WASTE: 'waste',
  GROUND_SURFACE: 'surface material', 'GROUND VEGETATION': 'ground vegetation', 'SURFACE LITTER': 'surface litter',
};
const smokeColors: Record<string, string> = { WHITE: 'White', GRAY: 'Gray', BLACK: 'Black', BROWN: 'Brown', MIXED: 'Mixed-color' };
const roleNames: Record<string, string> = { FIREFIGHTER: 'firefighters', OTHER_RESPONDER: 'other responders', CIVILIAN: 'civilians' };
const negativeClassifications = new Set(['NOT_VISIBLE', 'NO_VISIBLE_FOREST_FIRE', 'NO_VISIBLE_BURNING']);

function list(values: string[]) {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
}

function mappedValues(value: unknown, names: Record<string, string>, field?: string) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap(entry => {
    const key = field && entry && typeof entry === 'object' ? entry[field] : entry;
    const label = typeof key === 'string' ? names[key.toUpperCase()] : undefined;
    return label ? [label] : [];
  }))];
}

function supportedFinding(item: ChecklistItem): string | null {
  const known = item.known ?? {};
  const classification = known.classification?.value;
  switch (item.criterionKey) {
    case 'visible_flames':
      return classification === 'VISIBLE' ? 'Flames were visible in your photos.' : null;
    case 'smoke_visibility_color_origin': {
      if (classification !== 'VISIBLE') return null;
      const color = typeof known.smokeCategory?.value === 'string' ? smokeColors[known.smokeCategory.value.toUpperCase()] : undefined;
      return `${color ? `${color} smoke` : 'Smoke'} was visible in your photos.`;
    }
    case 'forest_woodland_fire':
      return classification === 'FOREST_FIRE_VISIBLE' ? 'Vegetation was visibly burning in a wooded area.' : null;
    case 'visibly_burning_material': {
      if (classification !== 'IDENTIFIABLE') return null;
      const materials = [...new Set([
        ...mappedValues(known.burningMaterials?.value, materialNames, 'category'),
        ...mappedValues(known.burningMaterial?.value, materialNames),
      ])];
      return materials.length ? `Visible burning involved ${list(materials)}.` : 'Burning material was identified in your photos.';
    }
    case 'fire_suppression':
      return classification === 'VISIBLE' ? 'Firefighting activity was visible in your photos.' : null;
    default:
      return null;
  }
}

function topicSummary(topic: ReturnType<typeof witnessTopics>[number], item: ChecklistItem | undefined, deferred: boolean): SummaryTopic {
  const status = topic.confirmed ? 'confirmed' : item?.status === 'uncertain' ? 'uncertain'
    : item?.status === 'unavailable' ? 'unavailable' : 'unassessed';
  const base = { key: topic.key, name: topic.name, status } as const;
  if (!item || status === 'unassessed') return { ...base, finding: 'This topic has not been assessed.' };
  if (status === 'unavailable') return { ...base, finding: 'The analysis could not assess this topic.' };

  const supported = supportedFinding(item);
  // Only the accumulated known values support a positive claim. A raw observation
  // can have failed the backend's image-quality checks or been superseded.
  const negative = !supported && item.observations?.some(observation => negativeClassifications.has(String(observation.result.classification)));
  const finding = supported ?? (status === 'confirmed' ? 'This topic was confirmed from your photos.' : 'Your photos did not confirm this yet.');

  if (status === 'confirmed') {
    if (topic.key === 'smoke_visibility_color_origin' && item.known?.apparentOrigin?.value === 'VISIBLE') {
      return { ...base, finding, detail: 'The area where smoke emerged was visible.' };
    }
    if (topic.key === 'fire_suppression') {
      const roles = mappedValues(item.known?.actors?.value, roleNames, 'role');
      if (roles.length) return { ...base, finding, detail: `Identified roles included ${list(roles)}.` };
    }
    return { ...base, finding };
  }

  const fields = item.unresolvedFields ?? [];
  const details = [
    ...(fields.includes('captureQuality') ? ['Blur or framing left this unclear.'] : []),
    ...(fields.includes('smokeCategory') ? ["The smoke's color is still unclear."] : []),
    ...(fields.includes('apparentOrigin') ? ['Where the smoke emerged is still unclear.'] : []),
    ...(fields.includes('actors') ? ['The people involved could not all be identified by role.'] : []),
    ...(fields.some(field => ['burningMaterial', 'burningMaterials'].includes(field)) ? ['Some burning material could not be identified.'] : []),
  ];
  const detail = negative ? 'Not seeing it in a photo does not rule it out elsewhere.' : details.slice(0, 2).join(' ')
    || (deferred ? 'This remained unclear after several photos.' : supported ? 'Some details are still unconfirmed.' : undefined);
  return { ...base, finding, ...(detail ? { detail } : {}) };
}

function sessionDuration(session: WitnessSession): string | null {
  if (!session.startedAt || !session.endedAt) return null;
  const milliseconds = Date.parse(session.endedAt) - Date.parse(session.startedAt);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return `${minutes} min`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)} hr${remainder ? ` ${remainder} min` : ''}`;
}

export function buildWitnessSummary(session: WitnessSession, snapshotCount: number | null) {
  const count = snapshotCount !== null && Number.isSafeInteger(snapshotCount) && snapshotCount >= 0 ? snapshotCount : null;
  const checklist = session.checklist;
  const topics = witnessTopics(checklist).map(topic => topicSummary(topic,
    checklist?.items.find(item => item.criterionKey === topic.key), checklist?.deferredCriteria?.includes(topic.key) ?? false));
  const confirmed = topics.filter(topic => topic.status === 'confirmed');
  const incomplete = topics.filter(topic => topic.status !== 'confirmed');
  const confirmedCount = confirmed.length;
  const headline = confirmedCount ? `You helped confirm ${confirmedCount} ${confirmedCount === 1 ? 'detail' : 'details'}.`
    : count === 0 ? 'No photos this time.' : count === null ? 'Your session has ended.' : 'Your photos are saved.';
  const contribution = count === null ? 'The photo count could not be loaded.'
    : count === 0 ? 'No photos were saved in this session.'
      : `${count} ${count === 1 ? 'photo saved' : 'photos saved'} with ${count === 1 ? 'its' : 'their'} capture time, location, and direction.`;
  return { confirmed, incomplete, total: topics.length, confirmedCount, headline, contribution, duration: sessionDuration(session) };
}
