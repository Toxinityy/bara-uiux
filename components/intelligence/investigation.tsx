'use client';

import { useRef, useState } from 'react';
import { displayPosition, formatTime, type Dataset, type Report } from '../../lib/intelligence';
import { needsReassessment, suggestions, type DemoAction } from '../../lib/investigation';

export function Investigation({ data, reportId, incidentId, selectReport, actions, onAction }: { data: Dataset; reportId: string | null; incidentId: string | null; selectReport: (id: string) => void; actions: DemoAction[]; onAction: (action: DemoAction) => void }) {
  const [pair, setPair] = useState<string[]>([]);
  const [tab, setTab] = useState('evidence');
  const [evidence, setEvidence] = useState<{ reportId: string; subject: string } | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('In review');
  const evidenceHeading = useRef<HTMLHeadingElement>(null);
  const report = data.reports.find(r => r.id === reportId);
  const incident = data.incidents.find(i => i.id === incidentId) ?? data.incidents.find(i => i.reportIds.includes(reportId ?? ''));
  const members = incident ? data.reports.filter(r => incident.reportIds.includes(r.id)) : report ? [report] : [];
  const history = actions.filter(a => a.incidentId === incident?.id);
  const stale = incident && needsReassessment(actions, incident.id);
  const source = evidence && data.reports.find(r => r.id === evidence.reportId);
  function choose(id: string) { setPair(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 2 ? [...current, id] : current); }
  function act(kind: DemoAction['kind'], id?: string) {
    if (!incident || !reason.trim()) return;
    onAction({ kind, incidentId: incident.id, reportId: id, reason: reason.trim(), status: kind === 'review' ? status : undefined, at: new Date().toISOString() });
    setReason('');
  }
  return <aside className="pro-inspector" aria-label="Investigation workspace">
    <header><span className="bi-demo-badge">Synthetic evidence</span><h2>{incident?.title ?? report?.title ?? 'Open an observation'}</h2><p>{incident?.id ?? report?.id ?? 'Select a report or provisional incident on the left.'}</p></header>
    <nav className="pro-tabs" aria-label="Investigation panels">{['evidence', 'relationships', 'timeline', 'compare'].map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === 'compare' ? `Compare (${pair.length}/2)` : value[0].toUpperCase() + value.slice(1)}</button>)}</nav>
    <div className="pro-body">
    {tab === 'evidence' && <>
      {incident && <><p>Review: <strong>{history.filter(a => a.kind === 'review').at(-1)?.status ?? 'Not reviewed'}</strong></p><p>Review completion does not confirm a fire or its location.</p></>}
      {stale && <p className="bi-notice">Membership changed. Incident conclusions need reassessment. The report assessments below remain source history, not current incident conclusions.</p>}
      <h3>Claim assessments</h3><p>Report scope only. Independence is unknown; no corroboration is inferred.</p>
      <div className="pro-claims">{(report ? [report] : members).map(r => <table key={r.id}><caption>{r.id} · synthetic report</caption><thead><tr><th>Claim / state</th><th>Source and gap</th></tr></thead><tbody>{r.claims.map(c => <tr key={c.subject}><th scope="row">{c.subject}<small>{c.assessment === 'Reported' ? 'Reported' : 'Insufficient'}</small></th><td>{c.source}<button className="bi-button" onClick={() => { setEvidence({ reportId: r.id, subject: c.subject }); requestAnimationFrame(() => evidenceHeading.current?.focus()); }}>Inspect evidence<span className="sr-only"> for {c.subject} in {r.id}</span></button></td></tr>)}</tbody></table>)}</div>
      {source && <section className="pro-evidence"><h3 ref={evidenceHeading} tabIndex={-1}>{evidence?.subject} — {source.id}</h3><Evidence report={source} /></section>}
      <h3>Agreements and discrepancies</h3><p>No incident-level assessment supplied. Read the original accounts side by side; different viewpoints and missing information do not establish a contradiction.</p>
      <h3>Unresolved questions</h3><p>Do these observations concern a shared source? Is fire present? Where is the source? Available records do not establish these answers.</p>
    </>}
    {tab === 'relationships' && <>
      <h3>Accepted membership</h3>{members.map(r => <div className="pro-member" key={r.id}><button onClick={() => selectReport(r.id)}>{r.id} · {r.title}</button><button className="bi-button" aria-pressed={pair.includes(r.id)} disabled={pair.length === 2 && !pair.includes(r.id)} onClick={() => choose(r.id)}>Compare</button>{incident && <button className="bi-button" disabled={!reason.trim()} onClick={() => act('remove', r.id)}>Remove relationship</button>}</div>)}
      <h3>Candidate relationships</h3>{suggestions.filter(s => s.incidentId === incident?.id).map(s => {
        const decision = history.filter(a => a.reportId === s.reportId).at(-1);
        return <section className="pro-member" key={s.reportId}><strong>{s.reportId} · Fixture suggestion</strong><p>{s.rationale}</p><p>{incident?.reportIds.includes(s.reportId) ? 'Accepted member' : decision?.kind === 'reject' ? 'Rejected in this demo session' : 'Candidate, not a member'}</p><button className="bi-button" aria-pressed={pair.includes(s.reportId)} disabled={pair.length === 2 && !pair.includes(s.reportId)} onClick={() => choose(s.reportId)}>Compare candidate</button><button className="bi-button" disabled={!reason.trim() || incident?.reportIds.includes(s.reportId)} onClick={() => act('accept', s.reportId)}>Accept</button><button className="bi-button" disabled={!reason.trim() || incident?.reportIds.includes(s.reportId) || decision?.kind === 'reject'} onClick={() => act('reject', s.reportId)}>Reject</button></section>;
      })}{!suggestions.some(s => s.incidentId === incident?.id) && <p>No suggestions supplied for this selection.</p>}
      {incident && <><label className="pro-field">Reason for demo action<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="What led to this decision?" /></label><label className="pro-field">Incident review status<select value={status} onChange={e => setStatus(e.target.value)}>{['Not reviewed', 'In review', 'Reviewed'].map(s => <option key={s}>{s}</option>)}</select></label><button className="bi-button" disabled={!reason.trim()} onClick={() => act('review')}>Apply demo review</button><p>Changes stay in this session. Remove an accepted relationship to correct it; reports and original evidence are retained.</p></>}
    </>}
    {tab === 'timeline' && <><h3>Incident timeline</h3><p>Synthetic observation and receipt events; local actions use the actual action time.</p><ol className="pro-timeline">{members.flatMap(r => [{ id: r.id, type: 'Report received', time: r.receivedAt }, ...(r.observedAt ? [{ id: r.id, type: 'Witness observation', time: r.observedAt }] : [])]).sort((a,b) => Date.parse(a.time)-Date.parse(b.time)).map(e => <li key={e.id + e.type}><strong>{e.type}</strong><time>{formatTime(e.time)}</time><button onClick={() => selectReport(e.id)}>{e.id}</button></li>)}{history.map((a,index) => <li key={index}><strong>Demo action: {a.kind} {a.reportId ?? a.status}</strong><time>{formatTime(a.at)}</time><p>{a.reason}</p></li>)}</ol><h3>Observation time unknown</h3>{members.filter(r => !r.observedAt).map(r => <p key={r.id}>{r.id} — receipt remains dated above.</p>)}{members.every(r => r.observedAt) && <p>None in this selection.</p>}</>}
    {tab === 'compare' && <><h3>Compare two reports</h3><p>Choose exactly two. Missing data is not disagreement.</p><div className="pro-picker">{data.reports.map(r => <label key={r.id}><input type="checkbox" checked={pair.includes(r.id)} disabled={pair.length === 2 && !pair.includes(r.id)} onChange={() => choose(r.id)} />{r.id} — {r.title}</label>)}</div>{pair.length === 2 && <div className="pro-comparison">{pair.map(id => { const r = data.reports.find(r => r.id === id); return r ? <section key={id}><h3>{id}</h3><Evidence report={r} /></section> : <p key={id}>{id} is no longer available.</p>; })}</div>}</>}
    </div>
  </aside>;
}

function Evidence({ report }: { report: Report }) {
  const position = displayPosition(report);
  return <dl className="pro-evidence-data">
    <div><dt>Original submitted media</dt><dd>Not provided. No image available.</dd></div>
    <div><dt>Original witness statement · synthetic</dt><dd>{report.description}</dd></div>
    <div><dt>Corrections and stated uncertainty</dt><dd>Uncertainty is preserved in the statement above. No separate corrections supplied.</dd></div>
    <div><dt>Observation time</dt><dd>{report.observedAt ? formatTime(report.observedAt) : 'Not provided'}</dd></div>
    <div><dt>Capture time</dt><dd>Not provided</dd></div>
    <div><dt>Receipt time</dt><dd>{formatTime(report.receivedAt)}</dd></div>
    <div><dt>Permitted observer position</dt><dd>{position ? `${position.latitude}, ${position.longitude} (synthetic observer position, not fire location)` : 'Unavailable'}</dd></div>
    <div><dt>Device measurement time / accuracy</dt><dd>Not provided</dd></div>
    <div><dt>Bearing / heading reference</dt><dd>Not provided / Reference unknown. No direction drawn.</dd></div>
    <div><dt>Plume-base visibility</dt><dd>See original witness wording; no structured measurement supplied.</dd></div>
    <div><dt>AI interpretation</dt><dd>Not provided</dd></div>
    <div><dt>External evidence context</dt><dd>Not provided. Basemap tiles are not incident evidence.</dd></div>
    <div><dt>Source lineage / independence</dt><dd>Not provided / Unknown. Separate report IDs do not establish independence.</dd></div>
  </dl>;
}
