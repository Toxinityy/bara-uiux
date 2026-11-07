'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionRequest, sessionSnapshotCount, type WitnessSession } from '../../lib/witness-api';

// Ending a session can precede the completion of an already admitted upload.
// Keep the recap tied to persisted evidence, including those late results.
export function useSessionSummary(initial: WitnessSession) {
  const [session, setSession] = useState(initial);
  const [snapshotCount, setSnapshotCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const [latest, count] = await Promise.allSettled([
      sessionRequest(`/${initial.id}`, 'GET', controller.signal),
      sessionSnapshotCount(initial.id, controller.signal),
    ]);
    if (controller.signal.aborted) return;
    if (latest.status === 'fulfilled' && latest.value.status === 'ended') {
      const updated = latest.value;
      setSession(previous => (updated.checklistRevision ?? 0) >= (previous.checklistRevision ?? 0) ? updated : previous);
    }
    if (count.status === 'fulfilled') setSnapshotCount(count.value);
    setError(latest.status === 'rejected' || count.status === 'rejected'
      ? 'Your session has ended. Some summary details could not be refreshed. Showing the saved results available.' : '');
    setLoading(false);
    request.current = null;
  }, [initial.id]);

  useEffect(() => {
    const startup = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
      window.removeEventListener('focus', focus);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);

  return { session, snapshotCount, loading, error, refresh };
}
