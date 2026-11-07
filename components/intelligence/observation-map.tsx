'use client';

import { useRef, useState } from 'react';
import { Crosshair, Minus, Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { displayPosition, type Report } from '../../lib/intelligence';

export type Viewport = { latitude: number; longitude: number; zoom: number };
export const initialViewport: Viewport = { latitude: -2.2, longitude: 113.8, zoom: 9 };

function project(latitude: number, longitude: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin(latitude * Math.PI / 180);
  return { x: (longitude + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

export function ObservationMap({ reports, selectedIds, hoveredId, onHover, onSelect, viewport, setViewport, pointsVisible = true }: {
  pointsVisible?: boolean;
  hoveredId: string | null; onHover: (id: string | null) => void;
  reports: Report[]; selectedIds: string[]; onSelect: (id: string) => void;
  viewport: Viewport; setViewport: (viewport: Viewport) => void;
}) {
  const [tileFailed, setTileFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; center: { x: number; y: number } } | null>(null);
  const [dragging, setDragging] = useState(false);
  const center = project(viewport.latitude, viewport.longitude, viewport.zoom);
  const tileX = Math.floor(center.x / 256);
  const tileY = Math.floor(center.y / 256);
  const located = reports.filter(r => displayPosition(r));
  function pan(dx: number, dy: number) {
    const step = 70 / (256 * 2 ** viewport.zoom) * 360;
    setViewport({ ...viewport, longitude: Math.max(-180, Math.min(180, viewport.longitude + dx * step)), latitude: Math.max(-80, Math.min(80, viewport.latitude + dy * step)) });
  }
  return <div className="bi-map" aria-label="Observation map">
    <div className={`bi-map-canvas${dragging ? ' is-dragging' : ''}`} role="group" tabIndex={0} aria-label="Observation map. Drag to explore, use arrow keys to pan, plus and minus to zoom. Panning does not filter reports."
      onPointerDown={event => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button,a')) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, center };
        setDragging(true);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        const scale = 256 * 2 ** viewport.zoom;
        const x = drag.current.center.x - (event.clientX - drag.current.x);
        const y = drag.current.center.y - (event.clientY - drag.current.y);
        setViewport({ ...viewport, longitude: Math.max(-180, Math.min(180, x / scale * 360 - 180)), latitude: Math.max(-80, Math.min(80, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180 / Math.PI)) });
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const moves: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        if (moves[event.key]) { event.preventDefault(); pan(...moves[event.key]); }
        if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); setViewport({ ...viewport, zoom: Math.max(7, Math.min(12, viewport.zoom + (event.key === '-' ? -1 : 1))) }); }
      }}>
      {!tileFailed && <div className="bi-tiles" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => {
        const x = tileX + i % 7 - 3;
        const y = tileY + Math.floor(i / 7) - 3;
        // Raster tiles keep this small map dependency-free; never send report coordinates to a tile URL.
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={`${viewport.zoom}-${x}-${y}`} alt="" draggable={false} width={256} height={256} style={{ left: `calc(50% + ${x * 256 - center.x}px)`, top: `calc(50% + ${y * 256 - center.y}px)` }} src={`https://tile.openstreetmap.org/${viewport.zoom}/${(x + 2 ** viewport.zoom) % 2 ** viewport.zoom}/${y}.png`} onError={() => setTileFailed(true)} />;
      })}</div>}
      <div className="bi-map-caption"><span className="bi-dot" />{located.length} observation locations <span className="bi-map-gesture">Drag to explore</span></div>
      <div className="bi-map-tools"><button aria-label="Zoom in" disabled={viewport.zoom >= 12} onClick={() => setViewport({ ...viewport, zoom: viewport.zoom + 1 })}><Plus size={18} /></button><button aria-label="Zoom out" disabled={viewport.zoom <= 7} onClick={() => setViewport({ ...viewport, zoom: viewport.zoom - 1 })}><Minus size={18} /></button><button aria-label="Reset map view" onClick={() => setViewport(initialViewport)}><Crosshair size={18} /></button></div>
      <div className="bi-pan-tools"><button aria-label="Pan map north" onClick={() => pan(0, 1)}><ArrowUp size={14} /></button><button aria-label="Pan map west" onClick={() => pan(-1, 0)}><ArrowLeft size={14} /></button><button aria-label="Pan map south" onClick={() => pan(0, -1)}><ArrowDown size={14} /></button><button aria-label="Pan map east" onClick={() => pan(1, 0)}><ArrowRight size={14} /></button></div>
      {pointsVisible && located.map(report => {
        const p = displayPosition(report)!;
        const point = project(p.latitude, p.longitude, viewport.zoom);
        const selected = selectedIds.includes(report.id);
        return <button key={report.id} className={`bi-marker${selected ? ' is-selected' : ''}${hoveredId === report.id ? ' is-hovered' : ''}`} style={{ left: `calc(50% + ${point.x - center.x}px)`, top: `calc(50% + ${point.y - center.y}px)` }} aria-label={`Observation location: ${report.id}, ${report.title}`} aria-pressed={selected} title={`${report.id} · ${report.area}`} onPointerEnter={() => onHover(report.id)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(report.id)} onBlur={() => onHover(null)} onClick={() => onSelect(report.id)}><MapPin size={19} strokeWidth={2} /><span>{hoveredId === report.id ? report.title : report.id.replace('DEMO-', '')}</span></button>;
      })}
      <a className="bi-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
    {tileFailed && <div className="bi-map-unavailable"><strong>Basemap unavailable</strong><span>Observation positions remain selectable. Read area labels in the report list.</span><button onClick={() => setTileFailed(false)}>Retry basemap</button></div>}
    <div className="bi-map-legend"><span><i /> Observation location</span><span><i className="selected" /> Selected</span><span>Observer position ≠ fire location</span></div>
  </div>;
}
