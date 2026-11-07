'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
import { Environment } from './environment';
import type { Location } from '../../lib/environment';
import { displayPosition, type Report } from '../../lib/intelligence';
export type Viewport = { latitude: number; longitude: number; zoom: number };
export const initialViewport: Viewport = { latitude: -2.2, longitude: 113.8, zoom: 9 };
type Props = { weatherPosition: Location | null; weatherReference: string; onWeatherColor: () => void; reports: Report[]; selectedIds: string[]; hoveredId: string | null; onHover: (id: string | null) => void; onSelect: (id: string) => void; viewport: Viewport; setViewport: (v: Viewport) => void; pointsVisible?: boolean; pro: boolean; density: boolean; radius: number; onSpatial: (ids: string[] | null) => void };
export function ObservationMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef(props);
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
        m.addSource('tiles',{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'? OpenStreetMap contributors'});
        m.addLayer({id:'tiles',type:'raster',source:'tiles'});
        m.addSource('reports',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        m.addLayer({id:'density',type:'heatmap',source:'reports',paint:{'heatmap-weight':1,'heatmap-radius':35,'heatmap-opacity':0.7,'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(0,0,0,0)',0.2,'#4c9cce',0.5,'#f2d483',1,'#e85b14']}});
        m.addLayer({id:'points',type:'circle',source:'reports',paint:{'circle-radius':6,'circle-color':'#ed630e','circle-stroke-color':'#fff','circle-stroke-width':2}});
        m.addLayer({id:'selection',type:'circle',source:'reports',filter:['in',['get','id'],['literal',[]]],paint:{'circle-radius':11,'circle-color':'transparent','circle-stroke-color':'#222','circle-stroke-width':3}});
        setReady(true);setWeatherMap(m);
      });
      m.on('click',e=>{if(latest.current.pro && !m.queryRenderedFeatures(e.point,{layers:['points']}).length)setWeatherLocation({latitude:e.lngLat.lat,longitude:e.lngLat.lng,context:JSON.stringify([latest.current.weatherPosition,latest.current.weatherReference])});});
      m.on('error', () => setError('A map resource is unavailable. Reports and evidence remain usable.'));
      m.on('click','points',e=>{const id=e.features?.[0]?.properties?.id;if(id)latest.current.onSelect(String(id));});
      m.on('moveend',()=>{const c=m.getCenter();latest.current.setViewport({latitude:c.lat,longitude:c.lng,zoom:m.getZoom()});});
    } catch {
      // WebGL initialization can fail synchronously; keep the evidence workspace usable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Interactive map unavailable on this device. Use the report list and table.'); return; }
    const resize = new ResizeObserver(()=>m.resize());resize.observe(host.current);
    return ()=>{resize.disconnect();m.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const m=map.current;if(!ready || !m)return;
    const located=props.reports.flatMap(r=>{const p=displayPosition(r);return p?[{type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[p.longitude,p.latitude]},properties:{id:r.id}}]:[];});
    (m.getSource('reports') as GeoJSONSource).setData({type:'FeatureCollection',features:located});
    m.setLayoutProperty('points','visibility',props.pointsVisible?'visible':'none');
    m.setLayoutProperty('density','visibility',props.pro && props.density && located.length>=10?'visible':'none');
    m.setPaintProperty('density','heatmap-radius',props.radius);
    m.setFilter('selection',['in',['get','id'],['literal',props.selectedIds]]);
  },[ready,props.reports,props.pointsVisible,props.density,props.pro,props.radius,props.selectedIds]);
  useEffect(()=>{const m=map.current;if(!m)return;const c=m.getCenter();if(Math.abs(c.lat-props.viewport.latitude)>.00001 || Math.abs(c.lng-props.viewport.longitude)>.00001)m.jumpTo({center:[props.viewport.longitude,props.viewport.latitude],zoom:props.viewport.zoom});},[props.viewport]);
  function fit() {const positions=props.reports.filter(r=>!props.selectedIds.length || props.selectedIds.includes(r.id)).flatMap(r=>{const p=displayPosition(r);return p?[[p.longitude,p.latitude] as [number,number]]:[];});if(!positions.length)return;const bounds=new maplibregl.LngLatBounds(positions[0],positions[0]);positions.forEach(p=>bounds.extend(p));map.current?.fitBounds(bounds,{padding:60,maxZoom:12,duration:0});}
  return <div className="analysis-map"><div className="analysis-map-toolbar"><button className="bi-button" onClick={fit}>Fit observations</button>{props.pro && <><button className="bi-button" onClick={()=>{const b=map.current?.getBounds();if(b)props.onSpatial(props.reports.filter(r=>{const p=displayPosition(r);return p&&b.contains([p.longitude,p.latitude]);}).map(r=>r.id));}}>Select current map area</button><button className="bi-button" onClick={()=>props.onSpatial(null)}>Clear spatial selection</button></>}</div><Environment map={weatherMap} pro={props.pro} position={weatherLocation?.context===JSON.stringify([props.weatherPosition,props.weatherReference])?weatherLocation:props.weatherPosition} reference={props.weatherReference} density={props.density} onColor={props.onWeatherColor}/><div ref={host} className="analysis-map-host" aria-label="Interactive observation map" />{error && <p role="status">{error}</p>}<p className="analysis-legend">Synthetic observer positions, not fire locations. Shift-drag selects a rectangle in Pro. {props.pro && props.density ? 'Density: blue (low) to orange (high), relative concentration. Fewer than 10 points: density hidden.' : 'Orange dots: observations. Dark ring: selected report.'}</p></div>;
}
