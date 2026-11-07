'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

import type {Map as GLMap,GeoJSONSource} from 'maplibre-gl';

import {grid,loadWeather,hourIndex,type Location,type Weather,type Variable} from '../../lib/environment';

import {formatTime} from '../../lib/intelligence';

const labels:Record<Variable,string>={temperature_2m:'Air temperature (°C)',relative_humidity_2m:'Relative humidity (%)',wind_speed_10m:'Wind speed (km/h)',wind_direction_10m:'Wind from (° true north)',precipitation:'Preceding hour precipitation (mm)'};

export function Environment({map,pro,position,reference,onColor,density}:{map:GLMap|null;pro:boolean;position:Location|null;reference:string;onColor:()=>void;density:boolean}){

 const [chart,setChart]=useState<Variable>('temperature_2m');
 const [latest,setLatest]=useState(false),[date,setDate]=useState(''),[hour,setHour]=useState<number|null>(null),[rows,setRows]=useState<Weather[]>([]),[selected,setSelected]=useState(0),[layer,setLayer]=useState<Variable|null>(null),[wind,setWind]=useState(false),[opacity,setOpacity]=useState(.5),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loadedKey,setLoadedKey]=useState('');

 const abort=useRef<AbortController|null>(null);const version=useRef(0);

 const target=latest?new Date().toISOString():reference;

 const day=date||target.slice(0,10);const selectedHour=hour??new Date(target).getUTCHours();const time=Date.parse(`${day}T${String(selectedHour).padStart(2,'0')}:00:00Z`);

 const contextKey=JSON.stringify([position,reference,latest,day]);const stale=loadedKey!==contextKey || !!error;

 useEffect(()=>()=>{abort.current?.abort();},[]);



 const load=useCallback(async (area=false)=>{

  abort.current?.abort();const controller=new AbortController();abort.current=controller;const current=++version.current;setBusy(true);setError('');

  try{

   let points:Location[];

   if(area&&map){const b=map.getBounds();points=grid(b.getWest(),b.getSouth(),b.getEast(),b.getNorth());}

   else if(position)points=[position];else throw new Error('No permitted report position. Choose a weather location on the map.');

   const next=await loadWeather(points,day,latest,controller.signal);if(current!==version.current||controller.signal.aborted)return;setRows(next);setSelected(0);setLoadedKey(contextKey);

  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Weather unavailable.');}finally{if(current===version.current)setBusy(false);}

 },[map,position,day,latest,contextKey]);

 useEffect(()=>{

  if(pro && position){

   // Async provider load updates its own pending/result states.

   // eslint-disable-next-line react-hooks/set-state-in-effect
   void load();

  }else{abort.current?.abort();}

  return()=>abort.current?.abort();

 },[load,position,pro]);

 useEffect(()=>{

  if(!map)return;

  if(!map.getSource('environment')){map.addSource('environment',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'environment',type:'fill',source:'environment',paint:{'fill-color':['interpolate',['linear'],['get','value'],0,'#4289b5',50,'#f0d47d',100,'#d95026'],'fill-opacity':.5}},'points');}

  const range=layer==='temperature_2m'?[-10,50]:layer==='precipitation'?[0,20]:[0,100];

  const features=rows.flatMap((r,index)=>{const i=hourIndex(r,time),v=layer?r.values[layer][i]:null;if(v==null||stale||!pro||density)return[];const x=r.longitude,y=r.latitude,d=.125;return[{type:'Feature' as const,properties:{value:v,index},geometry:{type:'Polygon' as const,coordinates:[[[x-d,y-d],[x+d,y-d],[x+d,y+d],[x-d,y+d],[x-d,y-d]]]}}];});

  (map.getSource('environment') as GeoJSONSource).setData({type:'FeatureCollection',features});

  map.setPaintProperty('environment','fill-opacity',opacity);map.setPaintProperty('environment','fill-color',['interpolate',['linear'],['get','value'],range[0],'#4289b5',(range[0]+range[1])/2,'#f0d47d',range[1],'#d95026']);

  const click=(e:{features?:{properties:Record<string,unknown>}[]})=>{const index=e.features?.[0]?.properties.index;if(typeof index==='number')setSelected(index);};map.on('click','environment',click);

  return()=>{map.off('click','environment',click);};

 },[map,rows,layer,opacity,time,pro,stale,density]);

 useEffect(()=>{

  if(!map)return;

  if(!map.getSource('weather-wind')){map.addSource('weather-wind',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'weather-wind',type:'line',source:'weather-wind',paint:{'line-color':'#152b44','line-width':2}},'points');}

  const features=rows.flatMap(r=>{const i=hourIndex(r,time),speed=r.values.wind_speed_10m[i],from=r.values.wind_direction_10m[i];if(!pro||!wind||stale||speed==null||speed===0||from==null)return[];const angle=(from+180)*Math.PI/180;const x=r.longitude,y=r.latitude;const dx=Math.sin(angle)*.08,dy=Math.cos(angle)*.08;return[{type:'Feature' as const,properties:{},geometry:{type:'MultiLineString' as const,coordinates:[[[x,y],[x+dx,y+dy]],[[x+dx*.65-dy*.2,y+dy*.65+dx*.2],[x+dx,y+dy],[x+dx*.65+dy*.2,y+dy*.65-dx*.2]]]}}];});

  (map.getSource('weather-wind') as GeoJSONSource).setData({type:'FeatureCollection',features});

 },[map,rows,time,wind,pro,stale]);

 const row=rows[selected];const index=row?hourIndex(row,time):-1;
 const chartValues=row?.values[chart]??[]; const chartMin=Math.min(0,...chartValues.filter((v):v is number=>v!==null)); const chartMax=Math.max(chartMin+1,...chartValues.filter((v):v is number=>v!==null));

 if (!pro) return null;
 return <section className="environment-panel" aria-label="Environmental conditions"><h2>Environmental conditions</h2><p>Real weather context / synthetic reports. Not confirmation of fire.</p><label>Time context<select value={latest?'latest':'report'} onChange={e=>{setLatest(e.target.value==='latest');setDate('');setHour(null);}}><option value="report">Report observation or dataset reference</option><option value="latest">Latest model estimate</option></select></label>{pro&&<><label>Date (UTC)<input type="date" value={day} onChange={e=>setDate(e.target.value)}/></label><label>Hour (UTC): {selectedHour}:00<input type="range" min="0" max="23" value={selectedHour} onChange={e=>setHour(Number(e.target.value))}/></label></>}

 <button className="bi-button" disabled={busy} onClick={()=>void load()}>Load / retry location</button>{pro&&<button className="bi-button" disabled={busy||!map} onClick={()=>void load(true)}>Load this map area</button>}{busy&&<p role="status">Loading weather...</p>}{error&&<p role="alert">{error}</p>}{row&&stale&&<p role="status">Previous context retained; stale. Load the selected context. Map weather hidden.</p>}

 {pro&&<><label>Color layer<select value={layer??''} onChange={e=>{setLayer((e.target.value||null) as Variable|null);if(e.target.value)onColor();}}><option value="">Off</option>{(['temperature_2m','relative_humidity_2m','precipitation'] as Variable[]).map(v=><option key={v} value={v}>{labels[v]}</option>)}</select></label><label>Opacity<input type="range" min="0" max="1" step=".1" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><label><input type="checkbox" checked={wind} onChange={e=>setWind(e.target.checked)}/> Wind arrows (toward; display length only)</label><p>Blue → yellow → orange: {layer==='temperature_2m'?'-10 to 50 °C':layer==='precipitation'?'0 to 20 mm':'0 to 100 %'}. Display cells 0.25°, not model boundaries. ERA5 resolution approximately 0.25°; latest model resolution varies. No interpolation.</p></>}

 {row&&<><p>{row.model}<br/>Source location: {row.latitude}, {row.longitude}<br/>Valid: {index>=0?formatTime(new Date(row.times[index]).toISOString()):'Unavailable for selected hour'}<br/>Retrieved: {formatTime(new Date(row.fetchedAt).toISOString())}</p><dl>{Object.entries(labels).map(([v,label])=><div key={v}><dt>{label}</dt><dd>{row.values[v as Variable][index]??'Unavailable'}</dd></div>)}</dl>{pro&&<><h3>24-hour series</h3><label>Chart variable<select value={chart} onChange={e=>setChart(e.target.value as Variable)}>{Object.entries(labels).filter(([v])=>v!=='wind_direction_10m').map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><p>{chartMin} to {chartMax}; hourly UTC samples. Missing values omitted.</p><svg viewBox="0 0 240 80" role="img" aria-label={`Hourly ${labels[chart]}; missing samples omitted`}>{chartValues.map((v,i)=>v===null?null:<circle key={i} cx={i*10+5} cy={75-((v-chartMin)/(chartMax-chartMin))*65} r="2" fill="currentColor"><title>{i}:00 UTC: {v} °C</title></circle>)}</svg><details><summary>Hourly values</summary><table><thead><tr><th>UTC hour</th><th>°C</th></tr></thead><tbody>{chartValues.map((v,i)=><tr key={i}><td>{i}:00</td><td>{v??'Unavailable'}</td></tr>)}</tbody></table></details></> }</>}

 <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a><p>CC BY 4.0. Historical reanalysis / latest model estimates. Wind text indicates direction from true north. Precipitation is the preceding hour total.</p></section>;

}
