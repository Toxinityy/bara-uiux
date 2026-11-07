import type { CaptureSession } from '../../lib/intelligence';
import { evidenceConfidence } from '../../lib/evidence-confidence';
import './evidence-confidence.css';
import { confidenceColors } from '../../lib/confidence-map';

export function EvidenceConfidence({ session, compact = false }: { session?: CaptureSession; compact?: boolean }) {
  const confidence = evidenceConfidence(session);
  const label = confidence.score === null ? 'Not assessed' : `${confidence.level} · ${confidence.score}/100`;
  if (compact) return <span className="confidence-badge" style={{ color: confidenceColors[confidence.level], borderColor: confidenceColors[confidence.level] }} data-level={confidence.level} title="Session evidence coverage, not fire probability">Session confidence: {label}</span>;
  return <section className="evidence-confidence" aria-label="Session evidence confidence" data-level={confidence.level}>
    <div className="confidence-heading"><h3>Session evidence confidence</h3><strong>{label}</strong></div>
    {confidence.score !== null && <meter min={0} max={100} value={confidence.score} aria-label={`Session evidence confidence: ${confidence.score} out of 100`} />}
    <p>{confidence.score === null ? 'No session checklist has been assessed yet.' : `${confidence.confirmed} of ${confidence.total} criteria confirmed. Each confirmed criterion adds 20 points.`}</p>
    <details><summary>What contributes to this score?</summary><ul className="confidence-criteria">{confidence.criteria.map(criterion => <li key={criterion.key} title={criterion.reason}><span>{criterion.name}</span><span>{criterion.qualifies ? '+20 · Confirmed' : criterion.status === 'unassessed' ? '0 · Not assessed' : criterion.status === 'unavailable' ? '0 · Unavailable' : '0 · Needs evidence'}</span></li>)}</ul><p>Equal weighting: Low = 1 criterion, Moderate = 2–3, High = 4–5. No confirmed criteria = 0. Distance is excluded because a single photo cannot reliably establish it.</p><p>This score summarizes accumulated session evidence, including earlier captures. It is not a calibrated probability of fire or a measure of danger. An incomplete score does not mean safe conditions.</p></details>
    <small>Evidence coverage, not fire probability.</small>
  </section>;
}
