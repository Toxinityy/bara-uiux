'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ChevronRight, FileText, Layers3, MapPinOff, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X, Info, Clock3 } from 'lucide-react';
import { displayPosition, filterReports, formatTime, loadIntelligence, parseFilters, captureSummary, captureAnalysisState, bearingLabel, validateDataset, type Dataset, type Filters, type Report } from '../../lib/intelligence';
import { initialViewport, ObservationMap, type Viewport } from './observation-map';

import { CaptureEvidence, Investigation } from './investigation';


const phoneQuery = '(max-width: 767px), (pointer: coarse) and (max-height: 500px)';
function subscribePhone(callback: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const defaultFilters: Filters = { area: 'all', period: 'all', search: '' };

export function IntelligenceDashboard() {
  const [baseData, setData] = useState<Dataset | null>(null);
  const [scenario, setScenario] = useState(false);
  const [analysis, setAnalysis] = useState<Dataset | null>(null);
  const [spatial, setSpatial] = useState<string[] | null>(null);
  const [after, setAfter] = useState('');
  const [before, setBefore] = useState('');
  const [undated, setUndated] = useState(true);
  const [density, setDensity] = useState(false);
  const [radius, setRadius] = useState(35);
  const [requestedMode, setMode] = useState('normal');
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(phoneQuery).matches, () => true);
  const mode = phone ? 'normal' : requestedMode;
  const [sessionFilter, setSessionFilter] = useState('all');
  const [missingLocation, setMissingLocation] = useState(false);
  const [points, setPoints] = useState(true);
  const currentData = scenario ? analysis : baseData;
  const data = currentData;
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [listView, setListView] = useState('reports');
  const [floatingPanel, setFloatingPanel] = useState('reports');
  const [mapFocus, setMapFocus] = useState(false);
  const [hoveredReport, setHoveredReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modeNotice, setModeNotice] = useState('');
  const [updated, setUpdated] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const initialized = useRef(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selectionTrigger = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async (useScenario = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    try {
      const next = await loadIntelligence(controller.signal, useScenario);
      if (version !== generation.current || controller.signal.aborted) return;
      if (!initialized.current) {
        const params = new URLSearchParams(window.location.search);
        setFilters(parseFilters(params, []));
        const mode = params.get('mode');
        if (mode === 'pro') setMode('pro');
        else if (mode && mode !== 'normal') setModeNotice('That mode is not available. You are viewing Normal.');
        initialized.current = true;
      }
      if (useScenario) setAnalysis(next);
      else setData(next);
      setUpdated(new Date().toISOString());
    } catch (reason) {
      if (controller.signal.aborted || version !== generation.current) return;
      setError(reason instanceof Error ? reason.message : 'Reports could not be loaded.');
    } finally {
      if (version === generation.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The adapter updates state only after its asynchronous request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => { request.current?.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (!baseData) return;
    // Keep free-text search, display coordinates, and evidence out of the URL.
    const params = new URLSearchParams({ mode });

    if (filters.period !== 'all') params.set('period', filters.period);
    window.history.replaceState(null, '', `/intelligence?${params}`);
  }, [baseData, filters.area, filters.period, mode]);

  useEffect(() => {
    if (selectedReport || selectedSession) detailHeading.current?.focus({ preventScroll: true });
  }, [selectedReport, selectedSession]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1250px)');
    const sync = () => {
      const panel = drawer.current;
      if (!panel) return;
      panel.close();
      if (mode === 'pro') panel.show();
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [mode, baseData]);

  async function switchScenario(value: boolean) {
    if (value && !analysis) {
      try { const response = await fetch('/data/intelligence-analysis.json'); if (!response.ok) throw new Error('Analysis scenario unavailable.'); setAnalysis(validateDataset(await response.json())); }
      catch { setError('Analysis scenario unavailable. Current records retained.'); return; }
    }
    setUndated(true); setScenario(value); setSessionFilter('all'); setMissingLocation(false); setSpatial(null); setSelectedReport(null); setSelectedSession(null); setFilters(defaultFilters); setAfter(''); setBefore(''); setUndated(true);
  }
  const scopedReports = data?.reports.filter(r => r.id.toLowerCase().includes(filters.search.trim().toLowerCase()))
    .filter(r => sessionFilter === 'all' || r.snapshot?.sessionId === sessionFilter)
    .filter(r => !missingLocation || !displayPosition(r))
    .filter(r => spatial === null || spatial.includes(r.id)) ?? [];
  const reports = data ? filterReports(scopedReports, { ...filters, search: '' }, data.referenceTime, 'observedAt', undated)
    .filter(r => undated || !!r.observedAt)
    .filter(r => { if (!after && !before) return true; if (!r.observedAt) return undated; const day = r.observedAt.slice(0,10); return (!after || day >= after) && (!before || day <= before); }) : [];
  const sessions = data?.sessions ?? [];
  const matchingSessions = sessions.filter(s => reports.some(r => r.snapshot?.sessionId === s.id));
  const summary = captureSummary(reports);
  const unlocated = reports.filter(r => !displayPosition(r)).length;
  const report = data?.reports.find(r => r.id === selectedReport);
  const session = sessions.find(s => s.id === selectedSession);
  const members = session ? data!.reports.filter(r => r.snapshot?.sessionId === session.id) : [];
  const selectedIds = selectedReport ? [selectedReport] : members.map(r => r.id);
  const undatedCount = scopedReports.filter(r => !r.observedAt).length;
  const pending = loading && !data;
  const activeFilters = [
    ...(sessionFilter !== 'all' ? [{ label: sessionFilter, clear: () => setSessionFilter('all') }] : []),
    ...(filters.period !== 'all' ? [{ label: filters.period === '24h' ? 'Captured: last 24 hours' : 'Captured: last 7 days', clear: () => setFilters({ ...filters, period: 'all' }) }] : []),
    ...(filters.search ? [{ label: `Search: ${filters.search}`, clear: () => setFilters({ ...filters, search: '' }) }] : []),
    ...(!undated ? [{ label: `Exclude unknown capture times (${undatedCount})`, clear: () => setUndated(true) }] : []),
    ...(missingLocation ? [{ label: 'Missing location', clear: () => setMissingLocation(false) }] : []),
    ...(spatial !== null ? [{ label: `${spatial.length} spatially selected`, clear: () => setSpatial(null) }] : []),
    ...(after || before ? [{ label: `Captured: ${after || 'any date'} to ${before || 'any date'} (UTC)`, clear: () => { setAfter(''); setBefore(''); } }] : []),
  ];
  function clearFilters() {
    setFilters(defaultFilters); setSessionFilter('all'); setMissingLocation(false); setSpatial(null); setAfter(''); setBefore(''); setUndated(true);
  }
  function closeWindow() {
    document.querySelector<HTMLButtonElement>(`.pro-window-bar button[data-panel-button="${floatingPanel}"]`)?.focus();
    setFloatingPanel('');
  }

  function selectReport(id: string) {
    selectionTrigger.current = document.activeElement as HTMLElement;
    setSelectedReport(id); setSelectedSession(null);
    const selected = data?.reports.find(r => r.id === id);
    const position = selected && displayPosition(selected);
    if (position) setViewport({ ...viewport, latitude: position.latitude, longitude: position.longitude });
  }
  function selectSession(id: string) {
    selectionTrigger.current = document.activeElement as HTMLElement;
    setSelectedSession(id); setSelectedReport(null);
    setViewport(initialViewport);
  }
  function closeDetails() {
    setSelectedReport(null); setSelectedSession(null);
    selectionTrigger.current?.focus();
  }

  function refreshFromControl() {
    if (loading) return;
    setLoading(true);
    setError('');
    void refresh(scenario);
  }

  return <div data-panel={floatingPanel} className={`bi-app${mode === 'pro' ? ' bi-pro' : ''}${mapFocus ? ' bi-exploring' : ''}`} onKeyDown={event => { if (event.key === 'Escape' && !(event.target instanceof Element && event.target.closest('select'))) { if (mapFocus) setMapFocus(false); else if (selectedReport || selectedSession) closeDetails(); else closeWindow(); } }}>
    <a className="skip-link" href="#intelligence-main">Skip to workspace</a>
    <header className="bi-header">
      <Link href="/" className="bi-brand" aria-label="BARA home"><span className="wordmark">BARA<span>.</span></span><span className="bi-brand-divider" /><span>Intelligence</span></Link>
      <div className="bi-mode" role="group" aria-label="Level of detail"><button aria-pressed={mode === 'normal'} onClick={() => setMode('normal')}>Normal</button>{!phone && <button aria-pressed={mode === 'pro'} onClick={() => setMode('pro')}>Pro</button>}</div>
      <div className="bi-header-right"><span className="bi-demo-badge"><span /> Synthetic preview</span><Link href="/"><ArrowUpRight size={15} aria-hidden="true" /> Back to BARA</Link></div>
    </header>

    <main id="intelligence-main" className="bi-main">
      <div className="bi-page-heading"><div><h1>{mode === 'pro' ? 'Investigation workspace' : 'Understand your area'}</h1><p>{mode === 'pro' ? 'Explore observations across space and time. Inspect the evidence behind each pattern.' : 'Browse captures, image findings, and what still needs evidence.'}</p></div><button className="bi-button" disabled={loading} onClick={refreshFromControl}><RefreshCw size={15} className={loading ? 'bi-spinning' : ''} aria-hidden="true" />{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {phone && requestedMode === 'pro' && <p className="bi-notice" role="status">You are using the simple Normal view. Pro is available on tablets and computers.</p>}
      {modeNotice && <div className="bi-notice" role="status"><Info size={16} />{modeNotice}<button aria-label="Dismiss mode message" onClick={() => setModeNotice('')}><X size={15} /></button></div>}

      {mode === 'pro' && <nav className="pro-window-bar" aria-label="Map workspace panels">{['reports', 'filters', 'layers', 'timeline', 'table', 'environment'].map(panel => <button key={panel} data-panel-button={panel} className="bi-button" aria-pressed={!mapFocus && floatingPanel === panel} onClick={() => { setMapFocus(false); setFloatingPanel(floatingPanel === panel ? '' : panel); }}>{panel === 'reports' ? 'Captures' : panel === 'timeline' ? 'Time range' : panel === 'table' ? 'Data table' : panel === 'filters' ? `Filters${activeFilters.length ? ` (${activeFilters.length})` : ''}` : panel[0].toUpperCase() + panel.slice(1)}</button>)}<button className="bi-button" aria-pressed={mapFocus} onClick={() => setMapFocus(!mapFocus)}>{mapFocus ? 'Restore windows' : 'Expand map'}</button><span>{reports.length} captures / {unlocated} unlocated {scenario ? '/ Synthetic map scenario' : '/ Synthetic preview'}{(after || before || !undated || spatial !== null || missingLocation || sessionFilter !== 'all' || filters.period !== 'all' || filters.search) ? ' / Filters active' : ''}</span></nav>}
      <section className="pro-query-window" aria-label="Capture filters">
        {mode === 'pro' && <header className="workspace-panel-title"><div><h2>Filter captures</h2><p>Narrow the observations on your map.</p></div><button className="bi-icon-button" aria-label="Close filters" onClick={closeWindow}><X size={17} /></button></header>}
        <div className="bi-filters" aria-label="Filter captures">
          <label className="bi-search"><span>Search captures</span><div><Search size={17} aria-hidden="true" /><input aria-label="Search captures" type="search" placeholder="Capture ID" value={filters.search} maxLength={240} disabled={!data} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div></label>
          <label htmlFor="intelligence-session"><span><Layers3 size={14} aria-hidden="true" /> Session</span><select id="intelligence-session" aria-label="Session" value={sessionFilter} disabled={!data} onChange={e => setSessionFilter(e.target.value)}><option value="all">All sessions</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></label>
          <label><span><Clock3 size={14} aria-hidden="true" /> Captured</span><select aria-label="Captured" value={filters.period} disabled={!data} onChange={e => setFilters({ ...filters, period: e.target.value as Filters['period'] })}><option value="all">Any time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select></label>
        </div>
        {mode === 'pro' && <label className="filter-location-toggle"><span><MapPinOff size={17} aria-hidden="true" /><span>Missing location<small>Only captures without a usable map position</small></span></span><input type="checkbox" checked={missingLocation} onChange={e => setMissingLocation(e.target.checked)} /></label>}
        {activeFilters.length > 0 && <div className="filter-chips" aria-label="Active filters">{activeFilters.map(f => <button key={f.label} onClick={f.clear} aria-label={`Remove filter: ${f.label}`}>{f.label}<X size={13} aria-hidden="true" /></button>)}</div>}
        {mode === 'pro' && <div className="filter-result-line"><span role="status"><strong>{reports.length}</strong> matching captures</span><button className="filter-reset" disabled={!activeFilters.length} onClick={clearFilters}>Reset filters</button></div>}
        {undatedCount > 0 && <p className="capture-time-note">{undatedCount} captures have unknown capture time; {undated ? 'included' : 'excluded'}.</p>}
        <details className="dataset-details"><summary>{scenario ? 'Map scenario / 72 captures' : 'Synthetic preview / 8 captures'}<span>Data settings</span></summary><div className="analysis-source"><label>Dataset<select value={scenario ? 'analysis' : 'original'} onChange={e => void switchScenario(e.target.value === 'analysis')}><option value="original">Original preview / 8 captures</option><option value="analysis">Map scenario / 72 captures</option></select></label><p>Synthetic examples aligned with the backend handoff. No API is connected. {data && <>Reference: {formatTime(data.referenceTime)}.</>}</p></div>
        </details>
        {error && <div className="bi-error" role="alert"><p>{error} {data ? 'Last loaded records are retained.' : 'Check your connection and try again.'}</p><button className="bi-button" disabled={loading} onClick={refreshFromControl}>Try again</button></div>}
      </section>
      <section className="bi-situation" aria-labelledby="situation-title" aria-busy={pending}>
        <div className="bi-situation-icon"><ShieldCheck size={23} strokeWidth={1.6} /></div><div><h2 id="situation-title">Available evidence</h2><p className="bi-summary-text">{pending ? 'Loading the available captures…' : !data ? 'Captures are not available yet.' : summary.text}</p><p>{data ? summary.unknown : 'Evidence and summary counts will appear when the data loads.'}</p>{data && summary.sources.length > 0 && <div className="bi-summary-sources"><span>Inspect findings</span>{summary.sources.slice(0, 3).map(id => <button key={id} onClick={() => selectReport(id)}>{id}<ArrowUpRight size={11} aria-hidden="true" /></button>)}{summary.sources.length > 3 && <span>and {summary.sources.length - 3} more in the list</span>}</div>}</div>
      </section>

      {mode === 'pro' && <section className="analysis-controls" aria-label="Capture time filters"><h2>Capture time</h2><p>Client capture timestamps, shown in UTC here. Receipt time is not available.</p><label>From (UTC)<input type="date" value={after} max={before || undefined} onChange={e => setAfter(e.target.value)} /></label><label>Through (UTC)<input type="date" value={before} min={after || undefined} onChange={e => setBefore(e.target.value)} /></label><label><input type="checkbox" checked={undated} onChange={e => setUndated(e.target.checked)} /> Include unknown capture times ({undatedCount})</label><button className="bi-button" onClick={() => { setAfter(''); setBefore(''); setUndated(true); }}>Clear time range</button></section>}
      <div className="bi-workspace">
        <section className="bi-records" aria-labelledby="reports-heading">
          <div className="bi-panel-heading"><h2 id="reports-heading">Captures & sessions</h2><SlidersHorizontal size={16} aria-hidden="true" /></div>
          <Tabs.Root value={listView} onValueChange={setListView}>
            <Tabs.List className="bi-list-tabs" aria-label="Record view"><Tabs.Trigger value="reports">Captures <span>{data ? reports.length : '—'}</span></Tabs.Trigger><Tabs.Trigger value="sessions">Sessions <span>{data ? matchingSessions.length : '—'}</span></Tabs.Trigger></Tabs.List>
            <Tabs.Content value="reports" className="bi-list-content"><div className="bi-list-note"><span>Most recently captured first</span><span>{data ? `${reports.length} results` : 'Loading'}</span></div><div className="bi-report-scroll">
              {pending && <div className="bi-empty" role="status">Loading captures and their evidence…</div>}
              {!pending && !data && <div className="bi-empty">Captures couldn’t be loaded. Use Try again above.</div>}
              {data && !reports.length && <div className="bi-empty"><Search size={23} /><h3>No matching captures</h3><p>Try a wider capture period or clear your filters.</p><button className="bi-button" onClick={clearFilters}>Clear filters</button></div>}
              {reports.map(r => <ReportRow key={r.id} report={r} selected={selectedIds.includes(r.id)} hovered={hoveredReport === r.id} onHover={setHoveredReport} onSelect={() => selectReport(r.id)} />)}
            </div></Tabs.Content>
            <Tabs.Content value="sessions" className="bi-list-content"><div className="bi-list-note">Capture sessions, not fire incidents</div><div className="bi-report-scroll">{matchingSessions.map(s => <button className={`bi-report-row${selectedSession === s.id ? ' is-selected' : ''}`} key={s.id} aria-pressed={selectedSession === s.id} onClick={() => selectSession(s.id)}><span className="bi-row-meta">{s.id}<span className="evidence-state">{s.status}</span></span><strong>{reports.filter(r => r.snapshot?.sessionId === s.id).length} matching captures</strong><span className="bi-row-time">Started {formatTime(s.startedAt)}</span><span className="bi-row-foot">Evidence coverage: {s.checklist?.verificationStatus ?? 'Not supplied'}<ChevronRight size={15} /></span></button>)}{!matchingSessions.length && <div className="bi-empty">No sessions match your current filters.</div>}</div></Tabs.Content>
          </Tabs.Root>
          <div className="bi-list-footer"><ShieldCheck size={13} /> Unlocated captures remain available.</div>
        </section>

        <section className="bi-map-panel" aria-labelledby="map-heading">
          <div className="bi-panel-heading"><div><h2 id="map-heading">Observation map</h2><p>Camera positions / Synthetic preview</p></div><button className="bi-button" aria-pressed={mapFocus} onClick={() => setMapFocus(!mapFocus)}>{mapFocus ? 'Restore windows' : 'Expand map'}<ArrowUpRight size={14} /></button></div>
          {mode === 'pro' && <section className="pro-layers" aria-label="Observation layers"><header className="workspace-panel-title"><div><h2>Observation layers</h2><p>Choose what appears on the map.</p></div><button className="bi-icon-button" aria-label="Close layers" onClick={closeWindow}><X size={17}/></button></header>
            <label className="layer-toggle"><span><strong>Observation points</strong><small>Permitted observer positions, not fire locations</small></span><input type="checkbox" checked={points} onChange={e => setPoints(e.target.checked)} /></label>
            <label className="layer-toggle"><span><strong>Observation density</strong><small>Relative concentration of submitted observations</small></span><input type="checkbox" checked={density} onChange={e => setDensity(e.target.checked)} /></label>
            {density && <div className="density-settings"><label>Smoothing radius <output>{radius}px</output><input type="range" min="10" max="80" value={radius} onChange={e => setRadius(Number(e.target.value))} /></label><p>Blue: lower concentration. Orange: higher. Fewer than 10 located observations: density is hidden. This is a display threshold, not a scientific validation.</p></div>}
            <p className="layer-footnote">These layers show where observations were submitted, not where fires are burning.</p>
            <details className="unavailable-layers"><summary>Unavailable layers</summary><p>Viewing directions: numeric headings are available, but their reference is unknown. No map ray is drawn.</p><p>Position uncertainty: no accuracy supplied.</p><p>Topography: no permitted terrain source configured.</p></details>
          </section>}
          {data ? <ObservationMap weatherPosition={report ? displayPosition(report) : null} weatherReference={report?.observedAt ?? data.referenceTime} onWeatherColor={() => setDensity(false)} pro={mode === 'pro'} density={density} radius={radius} onSpatial={setSpatial} pointsVisible={mode === 'normal' || points} reports={reports} selectedIds={selectedIds} hoveredId={hoveredReport} onHover={setHoveredReport} onSelect={selectReport} viewport={viewport} setViewport={setViewport} /> : <div className="bi-map-canvas bi-empty" role="status">{loading ? 'Loading observation map…' : 'Load reports to view observation locations.'}</div>}
          <div className="bi-map-bottom"><Info size={14} /><p>{data ? `${unlocated} matching ${unlocated === 1 ? 'capture is' : 'captures are'} not plotted. ` : ''}Map movement does not change your selection.</p></div>
        </section>
        {data && <div className="pro-pane" hidden={mode !== 'pro' || (!selectedReport && !selectedSession)}><button className="bi-button pro-drawer-trigger" onClick={() => drawer.current?.showModal()}>Open investigation inspector</button><dialog ref={drawer} className="pro-dialog" aria-label="Investigation inspector" onKeyDown={e => e.stopPropagation()}><button className="bi-button pro-drawer-close" onClick={closeDetails}>Close inspector</button><Investigation data={data} reportId={selectedReport} sessionId={selectedSession} selectReport={selectReport} /></dialog></div>}
      </div>

      {(report || session) && <section hidden={mode === 'pro'} className="bi-detail" aria-labelledby="detail-heading"><div className="bi-detail-top"><div><h2 id="detail-heading" ref={detailHeading} tabIndex={-1}>{report ? `Capture ${report.id}` : session?.id}</h2><p>Synthetic evidence preview</p></div><button className="bi-icon-button" aria-label="Close details" onClick={closeDetails}><X size={20} /></button></div>
        {report && <><CaptureEvidence report={report} compact />{!reports.some(r => r.id === report.id) && <p className="bi-exclusion">This capture is outside your filters. Clear filters to show it on the map.</p>}</>}
        {session && <><p>Session {session.status}. {members.length} captures. A session does not establish a shared fire.</p><p>Evidence coverage: {session.checklist?.verificationStatus ?? 'Not supplied'}. Completion does not verify an incident.</p><div className="bi-member-list">{members.map(r => <button key={r.id} onClick={() => selectReport(r.id)}><FileText size={17} /><span><strong>{r.id}</strong><small>Captured {r.observedAt ? formatTime(r.observedAt) : 'time unknown'}</small></span><ChevronRight size={17} /></button>)}</div></>}
      </section>}
      {(selectedReport && !report || selectedSession && !session) && <p className="bi-notice">The selected record is no longer available. Choose another explicitly.</p>}
      {mode === 'pro' && <section className="analysis-table"><h2>Capture records <small>{reports.length} matching</small></h2><p>{undatedCount} unknown capture times / {unlocated} unavailable positions / source independence unknown</p><div><table><thead><tr><th>Capture</th><th>Session</th><th>Captured (WIB)</th><th>AI processing</th><th>Heading</th></tr></thead><tbody>{reports.map(r => <tr key={r.id} aria-selected={selectedIds.includes(r.id)}><td><button onClick={() => selectReport(r.id)}>{r.id}</button></td><td>{r.snapshot?.sessionId ?? 'Not supplied'}</td><td>{r.observedAt ? formatTime(r.observedAt) : 'Unknown'}</td><td>{captureAnalysisState(r)}</td><td>{bearingLabel(r)}</td></tr>)}</tbody></table></div></section>}
      <footer className="bi-footer"><span><ShieldCheck size={14} /> Evidence in context. Uncertainty included.</span><p aria-live="polite">{loading ? 'Requesting preview captures…' : updated ? `${error ? 'Showing last successful load' : 'All preview captures loaded'} · Refreshed ${formatTime(updated)}` : 'Waiting for capture data'}</p><Link href="/"><ArrowLeft size={13} /> BARA home</Link></footer>
    </main>
  </div>;
}

function ReportRow({ report, selected, hovered, onHover, onSelect }: { report: Report; selected: boolean; hovered: boolean; onHover: (id: string | null) => void; onSelect: () => void }) {
  return <button className={`bi-report-row${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}`} aria-pressed={selected} onPointerEnter={() => onHover(report.id)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(report.id)} onBlur={() => onHover(null)} onClick={onSelect}>
    <span className="bi-row-meta">{report.id}<span className="evidence-state">AI: {captureAnalysisState(report)}</span></span>
    <strong>{report.observedAt ? formatTime(report.observedAt) : 'Capture time unknown'}</strong><span className="bi-row-area">{report.snapshot?.sessionId ?? 'Session not supplied'}{!displayPosition(report) && <span className="bi-unmapped"><MapPinOff size={12} /> Not mapped</span>}</span>
    <span className="bi-row-foot"><span>Inspect photo findings</span><ChevronRight size={15} aria-hidden="true" /></span>
  </button>;
}
