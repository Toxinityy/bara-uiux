'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ChevronRight, CircleHelp, FileText, Layers3, MapPin, MapPinOff, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X, LockKeyhole, Info, Clock3 } from 'lucide-react';
import { displayPosition, filterReports, formatTime, loadIntelligence, matchingIncidents, parseFilters, situationSummary, type Dataset, type Filters, type Report } from '../../lib/intelligence';
import { initialViewport, ObservationMap, type Viewport } from './observation-map';

const defaultFilters: Filters = { area: 'all', period: 'all', search: '' };

export function IntelligenceDashboard() {
  const [data, setData] = useState<Dataset | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [listView, setListView] = useState('reports');
  const [mapFocus, setMapFocus] = useState(false);
  const [hoveredReport, setHoveredReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modeNotice, setModeNotice] = useState('');
  const [updated, setUpdated] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const initialized = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selectionTrigger = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    try {
      const next = await loadIntelligence(controller.signal);
      if (version !== generation.current || controller.signal.aborted) return;
      if (!initialized.current) {
        const params = new URLSearchParams(window.location.search);
        setFilters(parseFilters(params, next.reports.flatMap(r => r.area ? [r.area] : [])));
        const mode = params.get('mode');
        if (mode && mode !== 'normal') setModeNotice(mode === 'pro' ? 'Pro is not available yet. You are viewing Normal.' : 'That mode is not available. You are viewing Normal.');
        initialized.current = true;
      }
      setData(next);
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
    if (!data) return;
    // Keep free-text search, display coordinates, and evidence out of the URL.
    const params = new URLSearchParams({ mode: 'normal' });
    if (filters.area !== 'all') params.set('area', filters.area);
    if (filters.period !== 'all') params.set('period', filters.period);
    window.history.replaceState(null, '', `/intelligence?${params}`);
  }, [data, filters.area, filters.period]);

  useEffect(() => {
    if (selectedReport || selectedIncident) detailHeading.current?.focus({ preventScroll: true });
  }, [selectedReport, selectedIncident]);

  const reports = data ? filterReports(data.reports, filters, data.referenceTime) : [];
  const incidents = data ? matchingIncidents(data.incidents, reports) : [];
  const areas = data ? [...new Set(data.reports.flatMap(r => r.area ? [r.area] : []))].sort() : [];
  const summary = situationSummary(reports);
  const unlocated = reports.filter(r => !displayPosition(r)).length;
  const report = data?.reports.find(r => r.id === selectedReport);
  const incident = data?.incidents.find(i => i.id === selectedIncident);
  const members = incident ? data!.reports.filter(r => incident.reportIds.includes(r.id)) : [];
  const selectedIds = selectedReport ? [selectedReport] : incident?.reportIds ?? [];
  const excludedUnknown = data?.reports.filter(r => !r.area).length ?? 0;
  const pending = loading && !data;

  function selectReport(id: string) {
    selectionTrigger.current = document.activeElement as HTMLElement;
    setSelectedReport(id); setSelectedIncident(null);
    const selected = data?.reports.find(r => r.id === id);
    const position = selected && displayPosition(selected);
    if (position) setViewport({ ...viewport, latitude: position.latitude, longitude: position.longitude });
  }
  function selectIncident(id: string) {
    selectionTrigger.current = document.activeElement as HTMLElement;
    setSelectedIncident(id); setSelectedReport(null);
    setViewport(initialViewport);
  }
  function closeDetails() {
    setSelectedReport(null); setSelectedIncident(null);
    selectionTrigger.current?.focus();
  }

  function refreshFromControl() {
    if (loading) return;
    setLoading(true);
    setError('');
    void refresh();
  }

  return <div className={`bi-app${mapFocus ? ' bi-exploring' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { if (selectedReport || selectedIncident) closeDetails(); else setMapFocus(false); } }}>
    <a className="skip-link" href="#intelligence-main">Skip to workspace</a>
    <header className="bi-header">
      <Link href="/" className="bi-brand" aria-label="BARA home"><span className="wordmark">BARA<span>.</span></span><span className="bi-brand-divider" /><span>Intelligence</span></Link>
      <div className="bi-mode" role="group" aria-label="Level of detail"><button aria-pressed="true">Normal</button><button disabled title="Pro investigation tools will be available in Part 2B">Pro <LockKeyhole size={12} aria-hidden="true" /></button></div>
      <div className="bi-header-right"><span className="bi-demo-badge"><span /> Demo data</span><Link href="/"><ArrowUpRight size={15} aria-hidden="true" /> Back to BARA</Link></div>
    </header>

    <main id="intelligence-main" className="bi-main">
      <div className="bi-page-heading"><div><h1>Situation overview</h1><p>Understand the reports. Keep the unknowns in view.</p></div><button className="bi-button" disabled={loading} onClick={refreshFromControl}><RefreshCw size={15} className={loading ? 'bi-spinning' : ''} aria-hidden="true" />{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {modeNotice && <div className="bi-notice" role="status"><Info size={16} />{modeNotice}<button aria-label="Dismiss mode message" onClick={() => setModeNotice('')}><X size={15} /></button></div>}

      <div className="bi-filters" aria-label="Filter reports">
        <label htmlFor="intelligence-area"><span><MapPin size={13} aria-hidden="true" /> Area</span><select id="intelligence-area" aria-label="Area" value={filters.area} disabled={!data} onChange={e => setFilters({ ...filters, area: e.target.value })}><option value="all">All areas</option>{areas.map(area => <option key={area}>{area}</option>)}</select></label>
        <label><span><Clock3 size={13} aria-hidden="true" /> Reports received</span><select aria-label="Reports received" value={filters.period} disabled={!data} onChange={e => setFilters({ ...filters, period: e.target.value as Filters['period'] })}><option value="all">All available</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select></label>
        <label className="bi-search"><span>Search reports</span><div><Search size={17} aria-hidden="true" /><input aria-label="Search reports" type="search" placeholder="Search by ID, description or area…" value={filters.search} maxLength={240} disabled={!data} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div></label>
      </div>

      <div className="bi-source-note"><Info size={14} aria-hidden="true" /><p>Synthetic examples, not live fire information.{data && <> Demo reference: <strong>{formatTime(data.referenceTime)}</strong>. All times in WIB.</>}</p></div>
      {filters.area !== 'all' && excludedUnknown > 0 && <p className="bi-exclusion">{excludedUnknown} {excludedUnknown === 1 ? 'report with an unknown area is' : 'reports with unknown areas are'} excluded by this area filter. Reports labeled {filters.area} remain included even without coordinates.</p>}
      {error && <div className="bi-error" role="alert"><CircleHelp size={20} /><div><strong>Couldn’t refresh the reports</strong><p>{error} {data ? 'The last successful dataset remains visible.' : 'Check your connection and try again.'}</p></div><button className="bi-button" disabled={loading} onClick={refreshFromControl}>Try again</button></div>}

      <section className="bi-situation" aria-labelledby="situation-title" aria-busy={pending}>
        <div className="bi-situation-icon"><ShieldCheck size={23} strokeWidth={1.6} /></div><div><h2 id="situation-title">What the records tell us</h2><p className="bi-summary-text">{pending ? 'Loading the available reports…' : !data ? 'Reports are not available yet.' : summary.text}</p><p>{data ? summary.unknown : 'Evidence and summary counts will appear when the data loads.'}</p>{data && summary.sources.length > 0 && <div className="bi-summary-sources"><span>Based on</span>{summary.sources.slice(0, 3).map(id => <button key={id} onClick={() => selectReport(id)}>{id}<ArrowUpRight size={11} aria-hidden="true" /></button>)}{summary.sources.length > 3 && <span>and {summary.sources.length - 3} more in the list</span>}</div>}</div>
      </section>

      <section className="bi-stats" aria-label="Selection totals" aria-busy={pending}>
        {[{ label: 'Reports', count: reports.length, description: 'Received in this selection', Icon: FileText }, { label: 'Provisional incidents', count: incidents.length, description: 'Existing groups linked to these reports', Icon: Layers3 }, { label: 'Not shown on map', count: unlocated, description: 'No authorized, usable display position', Icon: MapPinOff }].map(({ label, count, description, Icon }) => <div className="bi-stat" key={label}><div><span>{label}</span><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></div><strong>{data ? count.toString().padStart(2, '0') : '—'}</strong><p>{description}</p></div>)}
      </section>

      <div className="bi-workspace">
        <section className="bi-records" aria-labelledby="reports-heading">
          <div className="bi-panel-heading"><h2 id="reports-heading">Reports & incidents</h2><SlidersHorizontal size={16} aria-hidden="true" /></div>
          <Tabs.Root value={listView} onValueChange={setListView}>
            <Tabs.List className="bi-list-tabs" aria-label="Record view"><Tabs.Trigger value="reports">Reports <span>{data ? reports.length : '—'}</span></Tabs.Trigger><Tabs.Trigger value="incidents">Incidents <span>{data ? incidents.length : '—'}</span></Tabs.Trigger></Tabs.List>
            <Tabs.Content value="reports" className="bi-list-content"><div className="bi-list-note"><span>Most recently received first</span><span>{data ? `${reports.length} results` : 'Loading'}</span></div><div className="bi-report-scroll">
              {pending && <div className="bi-empty" role="status">Loading reports and their evidence…</div>}
              {!pending && !data && <div className="bi-empty">Reports couldn’t be loaded. Use Try again above.</div>}
              {data && !reports.length && <div className="bi-empty"><Search size={23} /><h3>No matching reports</h3><p>Try a wider receipt period or clear your filters.</p><button className="bi-button" onClick={() => setFilters(defaultFilters)}>Clear filters</button></div>}
              {reports.map(r => <ReportRow key={r.id} report={r} selected={selectedIds.includes(r.id)} hovered={hoveredReport === r.id} onHover={setHoveredReport} onSelect={() => selectReport(r.id)} />)}
            </div></Tabs.Content>
            <Tabs.Content value="incidents" className="bi-list-content"><div className="bi-list-note">Provisional groups, not confirmed fires</div><div className="bi-report-scroll">{incidents.map(i => <button className={`bi-report-row${selectedIncident === i.id ? ' is-selected' : ''}`} key={i.id} aria-pressed={selectedIncident === i.id} onClick={() => selectIncident(i.id)}><span className="bi-row-meta">{i.id}<span className="bi-status">Provisional</span></span><strong>{i.title}</strong><span className="bi-row-area"><Layers3 size={13} />{i.reportIds.filter(id => reports.some(r => r.id === id)).length} matching / {i.reportIds.length} linked reports</span><span className="bi-row-foot">Inspect member observations<ChevronRight size={15} /></span></button>)}{!incidents.length && <div className="bi-empty">{pending ? 'Loading incident records…' : 'No provisional incidents are linked to this selection. Ungrouped observations remain in Reports.'}</div>}</div></Tabs.Content>
          </Tabs.Root>
          <div className="bi-list-footer"><ShieldCheck size={13} /> Unlocated and ungrouped reports stay in the list.</div>
        </section>

        <section className="bi-map-panel" aria-labelledby="map-heading">
          <div className="bi-panel-heading"><div><h2 id="map-heading">Observation map</h2><p>Central Kalimantan · Synthetic observations</p></div><button className="bi-button" aria-pressed={mapFocus} onClick={() => setMapFocus(!mapFocus)}>{mapFocus ? 'Show reports' : 'Expand map'}<ArrowUpRight size={14} /></button></div>
          {data ? <ObservationMap reports={reports} selectedIds={selectedIds} hoveredId={hoveredReport} onHover={setHoveredReport} onSelect={selectReport} viewport={viewport} setViewport={setViewport} /> : <div className="bi-map-canvas bi-empty" role="status">{loading ? 'Loading observation map…' : 'Load reports to view observation locations.'}</div>}
          <div className="bi-map-bottom"><Info size={14} /><p>{data ? `${unlocated} matching ${unlocated === 1 ? 'report is' : 'reports are'} not plotted. ` : ''}Map movement does not change your selection.</p></div>
        </section>
      </div>

      {(report || incident) && <section className="bi-detail" aria-labelledby="detail-heading"><div className="bi-detail-top"><div><span>{report ? 'Report details' : 'Provisional incident'} / {report?.id ?? incident?.id}</span><h2 id="detail-heading" ref={detailHeading} tabIndex={-1}>{report?.title ?? incident?.title}</h2></div><button className="bi-icon-button" aria-label="Close details" onClick={closeDetails}><X size={20} /></button></div>
        {report && <><div className="bi-detail-grid"><div><h3>Reported observation</h3><p>{report.description}</p><span className="bi-detail-provenance">Source: synthetic witness statement. No media supplied.</span><dl><div><dt>Area</dt><dd>{report.area ?? 'Area unknown'}</dd></div><div><dt>Received</dt><dd>{formatTime(report.receivedAt)}</dd></div><div><dt>Observation time</dt><dd>{report.observedAt ? formatTime(report.observedAt) : 'Not provided'}</dd></div><div><dt>Review status</dt><dd>{report.review ?? 'Not supplied'}</dd></div><div><dt>Observation location</dt><dd>{displayPosition(report) ? `${displayPosition(report)!.latitude.toFixed(4)}, ${displayPosition(report)!.longitude.toFixed(4)} (observer)` : 'No authorized, usable display position'}</dd></div></dl></div><div><h3>Evidence & unknowns</h3><div className="bi-claims">{report.claims.map(c => <div key={c.subject}><div><strong>{c.subject}</strong><span className={`bi-status ${c.assessment === 'Reported' ? 'bi-reported' : ''}`}>{c.assessment}</span></div><p>{c.source}</p></div>)}</div><p className="bi-detail-caution">A witness statement records what was reported. It does not independently confirm a fire.</p></div></div>{!reports.some(r => r.id === report.id) && <p className="bi-exclusion">This selected report is outside your current filters. Clear filters to see it in the list and map.</p>}</>}
        {incident && <><p>This existing provisional group links observations for review. It does not establish a shared source or a fire location.</p><div className="bi-member-list">{members.map(r => <button key={r.id} onClick={() => selectReport(r.id)}><FileText size={17} /><span><strong>{r.title}</strong><small>{r.id} · {r.area ?? 'Area unknown'}{!reports.some(item => item.id === r.id) ? ' · Outside current filters' : ''}</small></span><ChevronRight size={17} /></button>)}</div></>}
      </section>}

      <footer className="bi-footer"><span><ShieldCheck size={14} /> Evidence in context. Uncertainty included.</span><p aria-live="polite">{loading ? 'Requesting demo records…' : updated ? `${error ? 'Showing last successful load' : 'All demo records loaded'} · Refreshed ${formatTime(updated)}` : 'Waiting for report data'}</p><Link href="/"><ArrowLeft size={13} /> BARA home</Link></footer>
    </main>
  </div>;
}

function ReportRow({ report, selected, hovered, onHover, onSelect }: { report: Report; selected: boolean; hovered: boolean; onHover: (id: string | null) => void; onSelect: () => void }) {
  return <button className={`bi-report-row${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}`} aria-pressed={selected} onPointerEnter={() => onHover(report.id)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(report.id)} onBlur={() => onHover(null)} onClick={onSelect}>
    <span className="bi-row-meta">{report.id}{report.review && <span className={`bi-status ${report.review.startsWith('Reviewed') ? 'bi-reviewed' : ''}`}>{report.review}</span>}</span>
    <strong>{report.title}</strong><span className="bi-row-area"><MapPin size={13} aria-hidden="true" />{report.area ?? 'Area unknown'}{!displayPosition(report) && <span className="bi-unmapped"><MapPinOff size={12} /> Not mapped</span>}</span>
    <span className="bi-row-time">Received {formatTime(report.receivedAt)}</span>
    <span className="bi-row-foot"><span>Observed {report.observedAt ? formatTime(report.observedAt) : 'time not provided'}</span><ChevronRight size={15} aria-hidden="true" /></span>
  </button>;
}
