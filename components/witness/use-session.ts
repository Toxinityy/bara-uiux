'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { captureSnapshot, instructionMessage, rejectInstruction, sendSnapshot, sessionRequest, WitnessApiError, type SnapshotMetadata, type WitnessSession } from '../../lib/witness-api';

const storageKey = 'bara.witness.activeSession';
const summaryStorageKey = 'bara.witness.lastEndedSession';
function remember(id: string | null) {
  try { if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
}
function rememberSummary(id: string | null) {
  try { if (id) sessionStorage.setItem(summaryStorageKey, id); else sessionStorage.removeItem(summaryStorageKey); } catch { /* Storage may be disabled. */ }
}

export function useSession() {
  const [session, setSession] = useState<WitnessSession | null>(null);
  const [completedSession, setCompletedSession] = useState<WitnessSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [guidance, setGuidance] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const latestRevision = useRef(0);
  const lifecycle = useRef(0);

  const completeSession = useCallback((current: WitnessSession) => {
    lifecycle.current++;
    rememberSummary(current.id);
    remember(null);
    setCompletedSession(current);
    setSession(null);
    latestRevision.current = 0;
    setGuidance('');
    setMessage('');
  }, []);

  function dismissSummary() {
    rememberSummary(null);
    setCompletedSession(null);
  }

  const checkSession = useCallback(async (id: string, signal?: AbortSignal) => {
    const current = await sessionRequest(`/${id}`, 'GET', signal);
    if (signal?.aborted || !mounted.current) return null;
    if (current.status === 'active') {
      if ((current.checklistRevision ?? 0) < latestRevision.current) return current;
      latestRevision.current = current.checklistRevision ?? 0;
      setSession(current);
      setCompletedSession(null);
      rememberSummary(null);
      remember(current.id);
      setGuidance(instructionMessage(current.instruction) ?? '');
    } else {
      completeSession(current);
    }
    return current;
  }, [completeSession]);

  useEffect(() => {
    mounted.current = true;
    const restore = new AbortController();
    const startup = window.setTimeout(() => {
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(summaryStorageKey); } catch { /* Storage may be disabled. */ }
      if (saved && /^[a-f\d]{24}$/i.test(saved)) {
        const id = saved;
        void checkSession(id, restore.signal).catch(error => {
          if (restore.signal.aborted) return;
          if (error instanceof WitnessApiError && error.status === 404) { remember(null); rememberSummary(null); }
          setMessage('Could not restore the session. Check your connection and retry.');
        }).finally(() => { if (!restore.signal.aborted) setChecking(false); });
      } else { setChecking(false); }
    }, 0);
    return () => { window.clearTimeout(startup); mounted.current = false; restore.abort(); controller.current?.abort(); };
  }, [checkSession]);

  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;
    let refreshing = false;
    const abort = new AbortController();
    const refresh = async () => {
      if (pending.current || refreshing) return;
      refreshing = true;
      const generation = lifecycle.current;
      try {
        const current = await sessionRequest(`/${sessionId}`, 'GET', abort.signal);
        if (abort.signal.aborted || pending.current || generation !== lifecycle.current || !mounted.current || (current.checklistRevision ?? 0) < latestRevision.current) return;
        latestRevision.current = current.checklistRevision ?? 0;
        if (current.status === 'active') {
          setSession(current);
          setGuidance(instructionMessage(current.instruction) ?? '');
        } else {
          completeSession(current);
        }
      } catch { /* Keep the last confirmed state during a temporary connection failure. */ }
      finally { refreshing = false; }
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { abort.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [sessionId, completeSession]);

  async function changeSession(action: 'start' | 'end'): Promise<boolean> {
    if (pending.current || checking) return false;
    if (action === 'start' && session?.status === 'active') return true;
    if (action === 'end' && !session) return false;
    lifecycle.current++;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      // Recover an unverified session before starting another one after a failed reload.
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
      if (action === 'start' && !session && saved) {
        try {
          const restored = await checkSession(saved);
          if (restored?.status === 'active') return true;
          if (restored?.status === 'ended') return false;
          if (!mounted.current) return false;
        }
        catch (error) {
          if (!(error instanceof WitnessApiError && error.status === 404)) throw error;
          remember(null);
        }
      }
      const current = await sessionRequest(action === 'end' ? `/${session!.id}/end` : '');
      if (!mounted.current) {
        if (current.status === 'active') remember(current.id);
        else { rememberSummary(current.id); remember(null); }
        return false;
      }
      if (current.status === 'active') {
        latestRevision.current = current.checklistRevision ?? 0;
        remember(current.id);
        setSession(current);
        setCompletedSession(null);
        rememberSummary(null);
        setGuidance('');
        setMessage('');
      } else {
        completeSession(current);
      }
      return true;
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Session request failed. Please try again.');
      return false;
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
      if (mounted.current) {
        const revision = result.checklistRevision ?? latestRevision.current;
        if (revision >= latestRevision.current) {
          latestRevision.current = revision;
          setSession(previous => previous ? { ...previous, checklist: result.checklist ?? previous.checklist,
            checklistRevision: revision, instruction: result.instruction } : previous);
          setGuidance(result.message);
        }
      }
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

  async function skipRequest() {
    if (pending.current || checking || !session?.instruction || session.instruction.status !== 'ready'
      || !session.instruction.gapId || session.instruction.checklistRevision === undefined) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    setGuidance('Skipping request…');
    try {
      const current = await rejectInstruction(session.id, session.instruction);
      if (!mounted.current) return;
      latestRevision.current = current.checklistRevision ?? latestRevision.current;
      if (current.status === 'ended') completeSession(current);
      else setSession(current);
      setGuidance(current.status === 'active' ? instructionMessage(current.instruction) ?? 'Request skipped.' : '');
    } catch (error) {
      if (!mounted.current) return;
      setMessage(error instanceof Error ? error.message : 'Could not skip the request. Please retry.');
      try { await checkSession(session.id); } catch { setGuidance(instructionMessage(session.instruction) ?? ''); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return { session, completedSession, dismissSummary, checking, busy, sending, message, guidance,
    startSession: () => changeSession('start'), endSession: () => changeSession('end'), capture, skipRequest };
}
