'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { captureSnapshot, instructionMessage, sendSnapshot, sessionRequest, WitnessApiError, type SnapshotMetadata, type WitnessSession } from '../../lib/witness-api';

const storageKey = 'bara.witness.activeSession';
function remember(id: string | null) {
  try { if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
}

export function useSession() {
  const [session, setSession] = useState<WitnessSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [guidance, setGuidance] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const checkSession = useCallback(async (id: string, signal?: AbortSignal) => {
    const current = await sessionRequest(`/${id}`, 'GET', signal);
    if (signal?.aborted || !mounted.current) return;
    if (current.status === 'active') {
      setSession(current);
      remember(current.id);
      setGuidance(instructionMessage(current.instruction) ?? '');
    } else {
      setSession(null);
      remember(null);
      setGuidance('');
      setMessage('Session ended. Start a new session to capture again.');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const restore = new AbortController();
    const startup = window.setTimeout(() => {
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
      if (saved && /^[a-f\d]{24}$/i.test(saved)) {
        const id = saved;
        void checkSession(id, restore.signal).catch(error => {
          if (restore.signal.aborted) return;
          if (error instanceof WitnessApiError && error.status === 404) remember(null);
          setMessage('Could not restore the session. Check your connection and retry.');
        }).finally(() => { if (!restore.signal.aborted) setChecking(false); });
      } else { setChecking(false); }
    }, 0);
    return () => { window.clearTimeout(startup); mounted.current = false; restore.abort(); controller.current?.abort(); };
  }, [checkSession]);

  async function toggleSession() {
    if (pending.current || checking) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      // Recover an unverified session before starting another one after a failed reload.
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
      if (!session && saved) {
        try { await checkSession(saved); return; }
        catch (error) {
          if (!(error instanceof WitnessApiError && error.status === 404)) throw error;
          remember(null);
        }
      }
      const current = await sessionRequest(session ? `/${session.id}/end` : '');
      if (!mounted.current) { if (current.status === 'active') remember(current.id); return; }
      if (current.status === 'active') {
        remember(current.id);
        setSession(current);
        setGuidance('');
        setMessage('Session started. Open the camera and wait for location and direction.');
      } else {
        remember(null);
        setSession(null);
        setGuidance('');
        setMessage('Session ended. Start a new session to capture again.');
      }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Session request failed. Please try again.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function capture(video: HTMLVideoElement, metadata: Omit<SnapshotMetadata, 'sessionId'>) {
    if (pending.current || checking || !session) return;
    pending.current = true;
    setSending(true);
    setMessage('');
    setGuidance('Saving snapshot and preparing the next request…');
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 100000);
    try {
      const form = await captureSnapshot(video, { ...metadata, sessionId: session.id });
      const result = await sendSnapshot(form, abort.signal);
      if (mounted.current) setGuidance(result);
    } catch (error) {
      if (!mounted.current) return;
      const text = abort.signal.aborted
        ? 'Upload timed out. The photo may have been saved. Check the session before retrying.'
        : error instanceof Error ? error.message : 'Could not upload the photo. Please try again.';
      setGuidance(text);
      if (error instanceof WitnessApiError && [404, 409].includes(error.status)) {
        try { await checkSession(session.id); }
        catch { setSession(null); remember(null); }
      }
    } finally {
      window.clearTimeout(timeout);
      controller.current = null;
      pending.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return { session, checking, busy, sending, message, guidance, toggleSession, capture };
}
