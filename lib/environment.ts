export type Location = { latitude: number; longitude: number };
export const variables = ['temperature_2m','relative_humidity_2m','wind_speed_10m','wind_direction_10m','precipitation'] as const;
export type Variable = typeof variables[number];
export type Weather = Location & { times: number[]; values: Record<Variable,(number|null)[]>; fetchedAt: number; model: string };
const cache = new Map<string,{until:number; value:Weather[]}>();
export function grid(west:number,south:number,east:number,north:number): Location[] {
  if (![west,south,east,north].every(Number.isFinite) || west>east || south>north || south < -85 || north>85) throw new Error('Choose a smaller map area.');
  const result:Location[]=[];
  for(let y=Math.ceil(south*4)/4;y<=north;y+=.25) for(let x=Math.ceil(west*4)/4;x<=east;x+=.25) { result.push({latitude:y,longitude:x});if(result.length>64)throw new Error('Zoom in: maximum 64 weather samples per area.'); }
  if(!result.length)result.push({latitude:(south+north)/2,longitude:(west+east)/2});
  return result;
}
export function parseWeather(raw:unknown, latest:boolean):Weather {
  const r=raw as {latitude:number;longitude:number;hourly:Record<string,unknown>;hourly_units:Record<string,string>};
  if(!r || !Number.isFinite(r.latitude)||!Number.isFinite(r.longitude)||!r.hourly||!r.hourly_units)throw new Error('Invalid weather response.');
  const times=r.hourly.time;
  if(!Array.isArray(times)||!times.length||!times.every(t=>typeof t==='number'&&Number.isFinite(t)))throw new Error('Invalid weather timestamps.');
  const units=['°C','%','km/h','°','mm'];
  const values={} as Weather['values'];
  variables.forEach((v,i)=>{const a=r.hourly[v];if(r.hourly_units[v]!==units[i]||!Array.isArray(a)||a.length!==times.length||!a.every(n=>n===null||(typeof n==='number'&&Number.isFinite(n))))throw new Error('Invalid weather values or units.');values[v]=a;});
  return {latitude:r.latitude,longitude:r.longitude,times:times.map(t=>t*1000),values,fetchedAt:Date.now(),model:latest?'Open-Meteo best match / model estimate':'ERA5 / historical reanalysis'};
}
export async function loadWeather(locations:Location[],day:string,latest:boolean,signal:AbortSignal):Promise<Weather[]> {
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(locations.some(p=>!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>85||Math.abs(p.longitude)>180))throw new Error('Invalid weather location.');
  if(!locations.length||locations.length>64||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid weather request.');
  const key=JSON.stringify([locations,day,latest]);const saved=cache.get(key);if(saved&&saved.until>Date.now())return saved.value;
  const result:Weather[]=[];
  for(let i=0;i<locations.length;i+=8){
    const batch=locations.slice(i,i+8);
    const params=new URLSearchParams({latitude:batch.map(p=>p.latitude).join(','),longitude:batch.map(p=>p.longitude).join(','),hourly:variables.join(','),start_date:day,end_date:day,timezone:'UTC',timeformat:'unixtime',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
    if(!latest)params.set('models','era5');
    const response=await fetch(`${latest?'https://api.open-meteo.com/v1/forecast':'https://archive-api.open-meteo.com/v1/archive'}?${params}`,{signal});
    if(!response.ok)throw new Error(`Weather unavailable (HTTP ${response.status}). Try again.`);
    const raw=await response.json();const rows=Array.isArray(raw)?raw:[raw];if(rows.length!==batch.length)throw new Error('Incomplete weather response.');
    rows.forEach(r=>result.push(parseWeather(r,latest)));
  }
  const unique=[...new Map(result.map(r=>[`${r.latitude},${r.longitude}`,r])).values()];
  if(!signal.aborted)cache.set(key,{until:Date.now()+(latest?900000:86400000),value:unique});
  return unique;
}
export function hourIndex(weather:Weather,time:number){return weather.times.findIndex(t=>t<=time&&time<t+3600000);}
