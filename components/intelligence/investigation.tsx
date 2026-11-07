'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { bearingLabel, captureAnalysisState, displayPosition, formatTime, type Dataset, type Report, type CaptureSession } from '../../lib/intelligence';
import './evidence-live.css';
import { EvidenceConfidence } from './evidence-confidence';

function time(value: string | null | undefined) { return value ? formatTime(value) : 'Not provided'; }
function fieldName(value: string) { return value.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2'); }

function ResultValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Not provided</span>;
  if (Array.isArray(value)) return value.length ? <ul>{value.map((v, i) => <li key={i}><ResultValue value={v} /></li>)}</ul> : <span>None supplied</span>;
  if (typeof value === 'object') return <dl className="result-fields">{Object.entries(value).map(([key, v]) => <div key={key}><dt>{fieldName(key)}</dt><dd><ResultValue value={v} /></dd></div>)}</dl>;
  return <span>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</span>;
}

function CapturePhoto({ report, demo }: { report: Report; demo: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const imageUrl = report.snapshot?.imageUrl;
  // Only the same-origin media endpoint is permitted to serve live evidence.
  const safeUrl = imageUrl && /^\/api\/backend\/snapshots\/[a-f\d]{24}\/image$/i.test(imageUrl) ? imageUrl : null;
  if (!safeUrl || demo) return <div className="capture-media"><ImageOff size={24} aria-hidden="true" /><strong>{demo ? 'Photo unavailable in this preview' : 'Photo unavailable'}</strong><span>{demo ? 'No real image was used to produce these illustrative findings.' : 'No image is available for this capture. Saved findings are shown below.'}</span></div>;
  return <figure className="capture-photo">
    <div className="capture-photo-frame" aria-busy={state === 'loading'}>
      {state !== 'error' && <Image key={attempt} src={`${safeUrl}${attempt ? `?retry=${attempt}` : ''}`} alt={`Witness capture ${report.id}`} fill unoptimized sizes="(max-width: 767px) 100vw, 780px" onLoad={() => setState('ready')} onError={() => setState('error')} />}
      {state === 'loading' && <span className="capture-photo-status" role="status">Loading photo…</span>}
      {state === 'error' && <div className="capture-photo-status" role="status"><ImageOff size={24} aria-hidden="true" /><strong>Photo could not be loaded</strong><span>Saved findings remain available.</span><button className="bi-button" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Retry photo</button></div>}
    </div>
    <figcaption><span>Captured {time(report.observedAt)}</span>{state === 'ready' && <a href={safeUrl} target="_blank" rel="noreferrer">Open full photo</a>}</figcaption>
  </figure>;
}

export function CaptureEvidence({ report, compact = false, demo = false }: { report: Report; compact?: boolean; demo?: boolean }) {
  const position = displayPosition(report);
  const snapshot = report.snapshot;
  return <div className="capture-evidence">
    <CapturePhoto key={`${report.id}:${snapshot?.imageUrl ?? ''}`} report={report} demo={demo} />
    <details className="capture-metadata" open={compact}><summary>Capture details</summary><dl className="pro-evidence-data">
      <div><dt>Capture time</dt><dd>{time(report.observedAt)}</dd></div>
      <div><dt>Analysis processing</dt><dd>{captureAnalysisState(report)}{!compact && <> · {time(snapshot?.analyzedAt)}</>}</dd></div>
      <div><dt>Camera position{demo ? ' · synthetic' : ''}</dt><dd>{position ? `${position.latitude}, ${position.longitude}` : 'Unavailable'}</dd></div>
        <div><dt>Camera heading</dt><dd>{bearingLabel(report)}</dd></div>
      {!compact && <>
        <div><dt>Location / heading accuracy</dt><dd>Not supplied. The map cone illustrates recorded heading with an assumed width and length; it is not a measured viewing footprint.</dd></div>
        <div><dt>Witness text / corrections / source lineage</dt><dd>Not supplied by the snapshot contract. Photos from one session are not independent corroboration.</dd></div></>}
    </dl></details>
    <h3>Photo findings</h3><p className="evidence-caution">AI image assessments, not witness statements or incident verification.</p>
    {!snapshot?.analyses?.length && <p>Analysis not supplied. Missing analysis does not establish safe conditions.</p>}
    {snapshot?.analyses?.map(a => <details key={a.criterionKey} className="criterion-result"><summary><span>{a.criterionName}</span><span className="evidence-state" data-state={a.status}>{a.status === 'completed' ? 'Completed' : 'Unavailable'}</span></summary>
      <p>{a.message}</p>{a.status === 'completed' && <ResultValue value={a.result} />}
      <small>Source: {report.id} · Criterion version {a.criterionVersion}{demo ? ' · Synthetic assessment' : ''}. Model / response identifiers: not supplied.</small>
    </details>)}
    <details className="criterion-result"><summary>Capture quality</summary><ResultValue value={snapshot?.captureQuality} /></details>
    <details className="criterion-result"><summary>Analysis notes and per-photo follow-up</summary><p className="saved-analysis-message">{snapshot?.analysisMessage ?? 'Not supplied'}</p><ResultValue value={snapshot?.followUp} /><p>This per-photo follow-up is separate from the current session request.</p></details>
  </div>;
}

export function SessionEvidence({ session, selectReport, demo = false }: { session: CaptureSession; selectReport: (id: string) => void; demo?: boolean }) {
  const checklist = session.checklist;
  const instruction = session.instruction;
  return <>
    <div className="session-state"><span>Capture session</span><strong>{session.status === 'active' ? 'Active' : 'Ended'}</strong></div>
    <p>A session groups captures. It does not identify a person or a shared fire.</p>
    <dl className="pro-evidence-data"><div><dt>Started</dt><dd>{time(session.startedAt)}</dd></div><div><dt>Ended</dt><dd>{session.endedAt ? time(session.endedAt) : session.status === 'active' ? 'Still active' : 'Not provided'}</dd></div></dl>
    <EvidenceConfidence session={session} />
    <h3>Evidence coverage <span className="evidence-state">{checklist?.verificationStatus ?? 'Not supplied'}</span></h3>
    <p>{checklist?.summary ?? 'No accumulated checklist supplied for this session.'}</p>
    {checklist && <><p>Revision {session.checklistRevision} · {checklist.gaps.length} unresolved fields. Coverage completion does not verify an incident.</p>
      {checklist.items.map(item => <details className="criterion-result" key={item.criterionKey}><summary><span>{item.criterionName}</span><span className="evidence-state" data-state={item.status}>{item.status}</span></summary>
        <p>Scope: {item.scope === 'current_snapshot' ? 'Current photo only' : 'Across this session'}</p>
        {Object.entries(item.known).map(([field, source]) => <div className="known-evidence" key={field}><strong>{fieldName(field)}</strong><ResultValue value={source.value} />{source.sources?.length ? <><p>Combined from {source.sources.length} source captures:</p>{source.sources.map((evidence, index) => <div className="known-source" key={`${evidence.snapshotId}-${index}`}><ResultValue value={evidence.value} /><button className="bi-button" onClick={() => selectReport(evidence.snapshotId)}>Inspect {evidence.snapshotId}</button><small>Captured {time(evidence.capturedAt)}</small></div>)}</> : <><button className="bi-button" onClick={() => selectReport(source.snapshotId)}>Inspect {source.snapshotId}</button><small>Captured {time(source.capturedAt)}</small></>}</div>)}
        {!Object.keys(item.known).length && <p>No known values supplied.</p>}
        <p>Unresolved: {item.unresolvedFields.length ? item.unresolvedFields.map(fieldName).join(', ') : 'None supplied'}</p>
        {item.observations.map((o, index) => <details className="source-observation" key={`${o.snapshotId}-${index}`}><summary>Source result · {o.snapshotId}</summary><button className="bi-button" onClick={() => selectReport(o.snapshotId)}>Inspect capture</button><small>Criterion version {o.criterionVersion}{o.capturedAt ? ` · Captured ${time(o.capturedAt)}` : ''}</small><ResultValue value={o.result} />{o.qualityUnavailable && <p>Capture quality could not be assessed. This result may not resolve the session checklist.</p>}{o.captureAssessment && <><h4>Capture quality for this criterion</h4><ResultValue value={o.captureAssessment} /></>}</details>)}
        {item.unavailableSnapshotIds.length > 0 && <div className="unavailable-captures"><p>Assessment unavailable for:</p>{item.unavailableSnapshotIds.map(id => <button key={id} className="bi-button" onClick={() => selectReport(id)}>Inspect {id}</button>)}</div>}
      </details>)}
      <h3>Missing information</h3>{checklist.gaps.length ? <ul className="gap-list">{checklist.gaps.map(gap => <li key={gap.id}><span>{fieldName(gap.criterionKey)} / {fieldName(gap.field)}</span><small>Priority {gap.priority}</small></li>)}</ul> : <p>No gaps supplied.</p>}
    </>}
    <h3>Current witness request</h3>
    <span className="evidence-state">{instruction?.status === 'ready' ? 'Ready' : instruction?.status === 'not_needed' ? 'Not needed' : 'Unavailable'}</span>
    <p>{instruction?.status === 'ready' ? instruction.witnessMessage ?? 'Request text not supplied.' : instruction?.status === 'not_needed' ? 'No additional information requested. Evidence may still be incomplete.' : 'No current request available; this does not mean the evidence is complete.'}</p>
    {instruction?.reason && <p>{instruction.reason}</p>}
    {instruction?.status === 'ready' && <small>Gap: {instruction.gapId ?? 'Not supplied'} · Revision {instruction.checklistRevision ?? 'Not supplied'}</small>}
    <p className="evidence-caution">{demo ? 'Synthetic preview. ' : ''}Capture and skip actions belong to Witness.</p>
  </>;
}

export function Investigation({ data, reportId, sessionId, selectReport }: { data: Dataset; reportId: string | null; sessionId: string | null; selectReport: (id: string) => void }) {
  const [pair, setPair] = useState<string[]>([]);
  const [tab, setTab] = useState('findings');
  const heading = useRef<HTMLHeadingElement>(null);
  const report = data.reports.find(r => r.id === reportId);
  const session = data.sessions?.find(s => s.id === (sessionId ?? report?.snapshot?.sessionId));
  const members = session ? data.reports.filter(r => r.snapshot?.sessionId === session.id) : report ? [report] : [];
  const events = [
    ...(session ? [{ id: session.id, type: 'Session started', time: session.startedAt }, ...(session.endedAt ? [{ id: session.id, type: 'Session ended', time: session.endedAt }] : [])] : []),
    ...members.flatMap(r => [...(r.observedAt ? [{ id: r.id, type: 'Photo captured', time: r.observedAt }] : []), ...(r.snapshot?.analyzedAt ? [{ id: r.id, type: 'Analysis processed', time: r.snapshot.analyzedAt }] : [])]),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  function inspect(id: string) { selectReport(id); setTab('findings'); requestAnimationFrame(() => heading.current?.focus()); }
  function choose(id: string) { setPair(current => current.includes(id) ? current.filter(x => x !== id) : current.length < 2 ? [...current, id] : current); }
  return <aside className="pro-inspector" aria-label="Capture evidence workspace">
    <header><h2 ref={heading} tabIndex={-1}>{report ? `Capture ${report.id}` : session?.id ?? 'Select a capture'}</h2><p>{report ? session?.id : `${members.length} captures`} · {data.demo ? 'Synthetic preview' : 'Live backend evidence'}</p></header>
    <nav className="pro-tabs" aria-label="Evidence panels">{[['findings','Findings'],['checklist','Checklist'],['timeline','Timeline'],['compare',`Compare (${pair.length}/2)`]].map(([value,label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>
    <div className="pro-body">
      {tab === 'findings' && (report ? <><EvidenceConfidence session={session} /><CaptureEvidence report={report} demo={data.demo} /></> : <><p>Choose a photo to inspect its findings.</p>{members.map(r => <button key={r.id} className="session-capture" onClick={() => inspect(r.id)}>{r.id}<span>{time(r.observedAt)}</span><small>Analysis: {captureAnalysisState(r)}</small></button>)}</>)}
      {tab === 'checklist' && (session ? <SessionEvidence session={session} selectReport={inspect} demo={data.demo} /> : <p>No session selected.</p>)}
      {tab === 'timeline' && <><h3>Session timeline</h3><p>Capture and analysis times are distinct. Receipt time is not exposed by the backend.</p><ol className="pro-timeline">{events.map(e => <li key={e.id+e.type}><strong>{e.type}</strong><time>{time(e.time)}</time>{e.type.startsWith('Session') ? <span>{e.id}</span> : <button onClick={() => inspect(e.id)}>{e.id}</button>}</li>)}</ol><h3>Capture time unknown</h3>{members.filter(r => !r.observedAt).map(r => <button key={r.id} className="bi-button" onClick={() => inspect(r.id)}>{r.id}</button>)}{members.every(r => r.observedAt) && <p>None in this session.</p>}</>}
      {tab === 'compare' && <><h3>Compare two captures</h3><p>Inspect differences in photos and AI findings. Session membership does not establish independence or a shared fire.</p><div className="pro-picker">{data.reports.map(r => <label key={r.id}><input type="checkbox" checked={pair.includes(r.id)} disabled={pair.length === 2 && !pair.includes(r.id)} onChange={() => choose(r.id)} />{r.id} · {time(r.observedAt)}</label>)}</div>{pair.length === 2 && <div className="pro-comparison">{pair.map(id => { const r = data.reports.find(r => r.id === id); return r ? <section key={id}><h3>{id}</h3><CaptureEvidence report={r} demo={data.demo} /></section> : <p key={id}>Capture unavailable.</p>; })}</div>}</>}
    </div>
  </aside>;
}
