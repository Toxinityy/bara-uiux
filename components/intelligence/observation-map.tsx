'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
import { Environment } from './environment';
import type { Location } from '../../lib/environment';
import { displayPosition, type Report, type CaptureSession } from '../../lib/intelligence';
import { confidenceLevels, confidenceColors, createSessionConfidenceMap } from '../../lib/confidence-map';
import type { ConfidenceLevel } from '../../lib/evidence-confidence';
import { viewingCone, VIEW_ANGLE, VIEW_DISTANCE } from '../../lib/viewing-cone';
import './map-confidence.css';
export type Viewport = { latitude: number; longitude: number; zoom: number };
export const initialViewport: Viewport = { latitude: -2.2, longitude: 113.8, zoom: 9 };
type Props = { sessions?: CaptureSession[]; confidenceLevels: ConfidenceLevel[]; onConfidenceLevelsChange: (levels: ConfidenceLevel[]) => void; conesVisible: boolean; onConesVisibleChange: (value: boolean) => void; demo?: boolean; weatherPosition: Location | null; weatherReference: string; onWeatherColor: () => void; reports: Report[]; selectedIds: string[]; hoveredId: string | null; onHover: (id: string | null) => void; onSelect: (id: string) => void; viewport: Viewport; setViewport: (v: Viewport) => void; pointsVisible?: boolean; pro: boolean; density: boolean; radius: number; onSpatial: (ids: string[] | null) => void };
export function ObservationMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef(props);
  const fitted = useRef(false);
  const [error, setError] = useState('');
  const [weatherMap,setWeatherMap] = useState<maplibregl.Map|null>(null);
  const [weatherLocation,setWeatherLocation] = useState<(Location & {context:string})|null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { latest.current = props; });
  useEffect(() => {
    if (!host.current) return;
    let m: maplibregl.Map;
    try {
      const v = latest.current.viewport;
      m = new maplibregl.Map({ container: host.current, center: [v.longitude,v.latitude], zoom:v.zoom, boxZoom: {boxZoomEnd: (instance, start, end) => {
        if (!latest.current.pro) return;
        const a=instance.unproject(start), b=instance.unproject(end);
        const bounds=new maplibregl.LngLatBounds([Math.min(a.lng,b.lng),Math.min(a.lat,b.lat)],[Math.max(a.lng,b.lng),Math.max(a.lat,b.lat)]);
        latest.current.onSpatial(latest.current.reports.filter(r=>{const p=displayPosition(r);return p && bounds.contains([p.longitude,p.latitude]);}).map(r=>r.id));
      }}, style: { version:8, sources: {}, layers:[{id:'background',type:'background',paint:{'background-color':'#dedfd7'}}] } });
      map.current=m;
      m.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
      m.on('load', () => {
        m.addSource('tiles',{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'});
        m.addLayer({id:'tiles',type:'raster',source:'tiles'});
        m.addSource('reports',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        m.addLayer({id:'density',type:'heatmap',source:'reports',paint:{'heatmap-weight':1,'heatmap-radius':35,'heatmap-opacity':0.7,'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(0,0,0,0)',0.2,'#4c9cce',0.5,'#f2d483',1,'#e85b14']}});
        m.addSource('direction-cone',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        m.addLayer({id:'direction-cone-fill',type:'fill',source:'direction-cone',paint:{'fill-color':['get','confidenceColor'],'fill-opacity':.28}});
        m.addLayer({id:'direction-cone-outline',type:'line',source:'direction-cone',paint:{'line-color':['get','confidenceColor'],'line-width':2,'line-opacity':.9}});
        m.addLayer({id:'points',type:'circle',source:'reports',paint:{'circle-radius':6,'circle-color':['get','confidenceColor'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
        m.addLayer({id:'selection',type:'circle',source:'reports',filter:['in',['get','id'],['literal',[]]],paint:{'circle-radius':11,'circle-color':'transparent','circle-stroke-color':'#222','circle-stroke-width':3}});
        setReady(true);setWeatherMap(m);
      });
      m.on('click',e=>{if(m.getLayer('points') && latest.current.pro && !m.queryRenderedFeatures(e.point,{layers:['points']}).length)setWeatherLocation({latitude:e.lngLat.lat,longitude:e.lngLat.lng,context:JSON.stringify([latest.current.weatherPosition,latest.current.weatherReference])});});
      m.on('error', () => setError('A map resource is unavailable. Captures and evidence remain usable.'));
      m.on('click','points',e=>{const id=e.features?.[0]?.properties?.id;if(id)latest.current.onSelect(String(id));});
      m.on('moveend',()=>{const c=m.getCenter();latest.current.setViewport({latitude:c.lat,longitude:c.lng,zoom:m.getZoom()});});
    } catch {
      // WebGL initialization can fail synchronously; keep the evidence workspace usable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Interactive map unavailable on this device. Use the capture list and table.'); return; }
    const resize = new ResizeObserver(()=>m.resize());resize.observe(host.current);
    return ()=>{resize.disconnect();m.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const m=map.current;if(!ready || !m)return;
    const confidenceBySession = createSessionConfidenceMap(props.sessions ?? []);
    const levelOf = (r: Report): ConfidenceLevel => confidenceBySession.get(r.snapshot?.sessionId ?? '')?.level ?? 'Not assessed';
    const located=props.reports.flatMap(r=>{const p=displayPosition(r);const level=levelOf(r);return p?[{type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[p.longitude,p.latitude]},properties:{id:r.id,confidenceLevel:level,confidenceColor:confidenceColors[level]}}]:[];});
    const selected = props.selectedIds.length === 1 ? props.reports.find(r => r.id === props.selectedIds[0]) : undefined;
    const selectedPosition = selected && displayPosition(selected);
    const ring = props.conesVisible && selectedPosition && typeof selected?.snapshot?.direction === 'number'
      ? viewingCone(selectedPosition.latitude, selectedPosition.longitude, selected.snapshot.direction) : [];
    (m.getSource('direction-cone') as GeoJSONSource).setData({type:'FeatureCollection',features:ring.length && selected ? [{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]},properties:{confidenceColor:confidenceColors[levelOf(selected)]}}] : []});
    (m.getSource('reports') as GeoJSONSource).setData({type:'FeatureCollection',features:located});
    if (!fitted.current && located.length) {
      const first = located[0].geometry.coordinates as [number, number];
      const bounds = new maplibregl.LngLatBounds(first, first);
      located.forEach(p => bounds.extend(p.geometry.coordinates as [number, number]));
      m.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
      fitted.current = true;
    }
    m.setLayoutProperty('points','visibility',props.pointsVisible?'visible':'none');
    m.setLayoutProperty('density','visibility',props.pro && props.density && located.length>=10?'visible':'none');
    m.setPaintProperty('density','heatmap-radius',props.radius);
    m.setFilter('selection',['in',['get','id'],['literal',props.selectedIds]]);
  },[ready,props.reports,props.sessions,props.conesVisible,props.pointsVisible,props.density,props.pro,props.radius,props.selectedIds]);
  useEffect(()=>{const m=map.current;if(!m)return;const c=m.getCenter();if(Math.abs(c.lat-props.viewport.latitude)>.00001 || Math.abs(c.lng-props.viewport.longitude)>.00001 || Math.abs(m.getZoom()-props.viewport.zoom)>.001)m.jumpTo({center:[props.viewport.longitude,props.viewport.latitude],zoom:props.viewport.zoom});},[props.viewport]);
  function fit() {
    const selected = props.reports.filter(r => props.selectedIds.includes(r.id));
    const targets = selected.length ? selected : props.reports;
    const positions = targets.flatMap(r => { const p = displayPosition(r); return p ? [[p.longitude,p.latitude] as [number,number]] : []; });
    if (!positions.length) return;
    if (selected.length === 1 && props.conesVisible) {
      const p = displayPosition(selected[0]);
      const heading = selected[0].snapshot?.direction;
      if (p && typeof heading === 'number') positions.push(...viewingCone(p.latitude,p.longitude,heading));
    }
    const bounds = new maplibregl.LngLatBounds(positions[0],positions[0]);
    positions.forEach(p => bounds.extend(p));
    map.current?.fitBounds(bounds,{padding:60,maxZoom:selected.length === 1 ? 19 : 13,duration:0});
  }
  const selected = props.selectedIds.length === 1 ? props.reports.find(r => r.id === props.selectedIds[0]) : undefined;
  const position = selected && displayPosition(selected);
  const heading = selected?.snapshot?.direction;
  const coneAvailable = !!position && typeof heading === 'number' && viewingCone(position.latitude,position.longitude,heading).length > 0;
  function toggleConfidence(level: ConfidenceLevel) {
    props.onConfidenceLevelsChange(props.confidenceLevels.includes(level) ? props.confidenceLevels.filter(item => item !== level) : [...props.confidenceLevels,level]);
  }
  return <div className="analysis-map">
    <div className="analysis-map-toolbar">
      <div className="map-confidence-legend" role="group" aria-label="Filter map by session confidence">
        <span>Session confidence</span>
        {confidenceLevels.map(level => <button key={level} type="button" aria-pressed={props.confidenceLevels.includes(level)} onClick={() => toggleConfidence(level)}><i aria-hidden="true" style={{backgroundColor:confidenceColors[level]}} />{level}</button>)}
        <button type="button" onClick={() => props.onConfidenceLevelsChange([...confidenceLevels])} disabled={props.confidenceLevels.length === confidenceLevels.length}>All</button>
        <button type="button" onClick={() => props.onConfidenceLevelsChange([])} disabled={!props.confidenceLevels.length}>None</button>
      </div>
      <div className="map-navigation-actions">
        <button className="bi-button" onClick={fit}>Fit observations</button>
        <button className="bi-button" aria-pressed={props.conesVisible} onClick={() => props.onConesVisibleChange(!props.conesVisible)}>Direction cone {props.conesVisible ? 'on' : 'off'}</button>
        {props.pro && <><button className="bi-button" onClick={()=>{const b=map.current?.getBounds();if(b)props.onSpatial(props.reports.filter(r=>{const p=displayPosition(r);return p&&b.contains([p.longitude,p.latitude]);}).map(r=>r.id));}}>Select current map area</button><button className="bi-button" onClick={()=>props.onSpatial(null)}>Clear spatial selection</button></>}
      </div>
      {props.conesVisible && <p className="map-direction-note">{coneAvailable ? `Recorded heading ${Math.round(heading!)}° · Illustrative ${VIEW_ANGLE}° / ${VIEW_DISTANCE} m cone; camera field of view and distance are not measured. North reference unverified.` : selected ? 'Direction cone unavailable: this capture needs a valid position and heading.' : 'Select one capture to see its recorded direction cone.'}</p>}
    </div>
    <Environment map={weatherMap} pro={props.pro} position={weatherLocation?.context===JSON.stringify([props.weatherPosition,props.weatherReference])?weatherLocation:props.weatherPosition} reference={props.weatherReference} density={props.density} onColor={props.onWeatherColor}/>
    <div ref={host} className="analysis-map-host" aria-label="Interactive observation map" />
    {error && <p role="status">{error}</p>}
    <p className="analysis-legend">{props.demo ? 'Synthetic observer positions' : 'Recorded camera positions'}, not fire locations. Colors show session evidence confidence, not fire probability. Dark ring: selected capture. {props.pro && props.density ? 'Density remains a separate blue-to-orange concentration layer.' : ''}</p>
  </div>;
}
