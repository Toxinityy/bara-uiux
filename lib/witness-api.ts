export type WitnessSession = {
  id: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string | null;
  instruction?: { status: string; witnessMessage?: string };
};

export type SnapshotMetadata = {
  sessionId: string;
  time: string;
  location: { latitude: number; longitude: number };
  direction: number;
};

export class WitnessApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api/backend${path}`, { cache: 'no-store', ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message
      : Array.isArray(body?.message) ? body.message.join(' ')
      : `Request failed (HTTP ${response.status}). Please try again.`;
    throw new WitnessApiError(message, response.status);
  }
  return body;
}

export async function sessionRequest(path = '', method: 'GET' | 'POST' = 'POST', signal?: AbortSignal): Promise<WitnessSession> {
  const timeout = AbortSignal.timeout(15000);
  const body = await request(`/sessions${path}`, { method, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const session = body?.data;
  if (!session || !/^[a-f\d]{24}$/i.test(session.id) || !['active', 'ended'].includes(session.status)) {
    throw new Error('The backend returned an invalid session. Please check the session again.');
  }
  return session;
}

export async function captureSnapshot(video: HTMLVideoElement, metadata: SnapshotMetadata): Promise<FormData> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight || video.paused || video.ended) {
    throw new Error('Camera is not ready. Wait for the live preview and try again.');
  }
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not capture a camera frame.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode the snapshot.')), 'image/jpeg', 0.85);
  });
  if (image.size > 8 * 1024 * 1024) throw new Error('Snapshot exceeds the 8 MiB upload limit.');
  const form = new FormData();
  form.append('image', image, 'snapshot.jpg');
  form.append('metadata', JSON.stringify(metadata));
  return form;
}

export function instructionMessage(instruction?: WitnessSession['instruction']): string | null {
  if (instruction?.status === 'ready' && instruction.witnessMessage) return instruction.witnessMessage;
  if (instruction?.status === 'not_needed') return 'Snapshot saved. No additional information is requested right now.';
  return null;
}

export async function sendSnapshot(form: FormData, signal?: AbortSignal): Promise<string> {
  const body = await request('/snapshots', { method: 'POST', body: form, signal: signal ?? AbortSignal.timeout(100000) });
  if (!body?.data?.id) throw new Error('The backend did not confirm the snapshot. Check the session before trying again.');
  return instructionMessage(body.instruction) ?? (typeof body.message === 'string' ? body.message : 'Snapshot saved. The next request is temporarily unavailable.');
}
