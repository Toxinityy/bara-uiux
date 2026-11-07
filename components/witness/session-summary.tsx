'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Camera, Check, CircleHelp, Minus, RotateCcw } from 'lucide-react';
import type { WitnessSession } from '../../lib/witness-api';
import { buildWitnessSummary } from '../../lib/witness-summary';

type SessionSummaryProps = {
  session: WitnessSession;
  snapshotCount: number | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onStartNew: () => void;
  starting: boolean;
  startDisabled: boolean;
};

const statusLabels = {
  confirmed: 'Confirmed',
  uncertain: 'Needs more evidence',
  unavailable: 'Assessment unavailable',
  unassessed: 'Not assessed',
};

export function SessionSummary({ session, snapshotCount, loading, error, onRetry, onStartNew, starting, startDisabled }: SessionSummaryProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const summary = buildWitnessSummary(session, snapshotCount);
  const empty = snapshotCount === 0;
  const awaitingResults = snapshotCount !== null && Array.isArray(session.checklist?.snapshotIds)
    && snapshotCount > session.checklist.snapshotIds.length;

  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [session.id]);

  return <div className="bw-summary">
    <div className="bw-summary-inner">
      <header className="bw-summary-header">
        <Link href="/" className="bw-summary-home"><ArrowLeft size={16} aria-hidden="true" />Back to BARA</Link>
        <span>BARA Witness</span>
      </header>

      <section className="bw-summary-intro" aria-labelledby="bw-summary-title">
        <span className="bw-summary-mark" aria-hidden="true"><Check size={24} strokeWidth={1.7} /></span>
        <h1 id="bw-summary-title" ref={title} tabIndex={-1}>Session complete.</h1>
        <p className="bw-summary-headline">{summary.headline}</p>
        <p className="bw-summary-contribution" role="status">{loading && snapshotCount === null ? 'Checking your saved photos…' : summary.contribution}</p>
      </section>

      <dl className="bw-summary-stats" aria-label="Your session at a glance">
        <div><dt>Photos saved</dt><dd>{snapshotCount ?? (loading ? '…' : '—')}</dd></div>
        <div><dt>Topics confirmed</dt><dd>{summary.confirmedCount}<span> / {summary.total}</span></dd></div>
        {summary.duration && <div><dt>Session time</dt><dd className="bw-summary-duration">{summary.duration}</dd></div>}
      </dl>

      {awaitingResults && <p className="bw-summary-scope" role="status">Some saved photos are still awaiting assessment. This summary updates as results arrive.</p>}

      {error && <div className="bw-summary-error">
        <p role="alert">{error}</p>
        <button className="bw-summary-retry" disabled={loading} onClick={onRetry}><RotateCcw size={14} aria-hidden="true" />{loading ? 'Refreshing…' : 'Refresh summary'}</button>
      </div>}

      {empty ? <section className="bw-summary-empty" aria-labelledby="bw-summary-empty-title">
        <Camera size={23} strokeWidth={1.5} aria-hidden="true" />
        <h2 id="bw-summary-empty-title">No photos this time.</h2>
        <p>There is no captured evidence to assess. You can start another session whenever you’re ready.</p>
      </section> : <div className="bw-summary-findings">
        <section className="bw-summary-group" aria-labelledby="bw-summary-confirmed-title">
          <div className="bw-summary-section-heading"><h2 id="bw-summary-confirmed-title">What you confirmed</h2><span>{summary.confirmedCount}</span></div>
          {summary.confirmed.length ? <ul className="bw-summary-list">
            {summary.confirmed.map(topic => <li key={topic.key} data-status="confirmed">
              <Check size={18} strokeWidth={2} aria-hidden="true" />
              <div><h3>{topic.name}</h3><p>{topic.finding}</p>{topic.detail && <p className="bw-summary-detail">{topic.detail}</p>}</div>
            </li>)}
          </ul> : <p className="bw-summary-no-findings">No topics confirmed yet. {snapshotCount === null ? 'The saved assessment has not confirmed a finding.' : 'Your photos are saved, even where a clear finding could not be made.'}</p>}
        </section>

        {summary.incomplete.length > 0 && <section className="bw-summary-group" aria-labelledby="bw-summary-unclear-title">
          <div className="bw-summary-section-heading"><h2 id="bw-summary-unclear-title">Still unclear</h2><span>{summary.incomplete.length}</span></div>
          <ul className="bw-summary-list">
            {summary.incomplete.map(topic => <li key={topic.key} data-status={topic.status}>
              {topic.status === 'uncertain' ? <CircleHelp size={18} strokeWidth={1.7} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}
              <div><h3>{topic.name}</h3><span className="bw-summary-status">{statusLabels[topic.status]}</span><p>{topic.finding}</p>{topic.detail && <p className="bw-summary-detail">{topic.detail}</p>}</div>
            </li>)}
          </ul>
        </section>}
        {summary.incomplete.length === 0 && summary.confirmed.length > 0 && <p className="bw-summary-all-confirmed">All observation topics were confirmed from this session’s evidence.</p>}
      </div>}

      {!empty && <p className="bw-summary-scope">These findings describe the views you captured. Something not visible in a photo may still be present outside it.</p>}

      <footer className="bw-summary-footer">
        <button className="bw-primary" disabled={startDisabled || starting} onClick={onStartNew}>{starting ? 'Starting session…' : 'Start new session'}<ArrowUpRight size={18} aria-hidden="true" /></button>
        <p>Your session has ended. You can stop here.</p>
      </footer>
    </div>
  </div>;
}
