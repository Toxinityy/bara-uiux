import test from 'node:test';

import assert from 'node:assert/strict';

import {grid,parseWeather,hourIndex,loadWeather} from '../lib/environment.ts';

const raw={latitude:-2.25,longitude:113.75,hourly_units:{temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h',wind_direction_10m:'°',precipitation:'mm'},hourly:{time:[1787040000],temperature_2m:[36.5],relative_humidity_2m:[29],wind_speed_10m:[8.2],wind_direction_10m:[139],precipitation:[0]}};

test('provider fixture preserves coordinates, units, UTC and zero precipitation',()=>{const r=parseWeather(raw,false);assert.equal(r.latitude,-2.25);assert.equal(r.values.precipitation[0],0);assert.equal(hourIndex(r,1787040000000),0);assert.equal(hourIndex(r,0),-1);assert.throws(()=>parseWeather({...raw,hourly_units:{}},false));});

test('missing values remain null and malformed arrays are rejected',()=>{assert.equal(parseWeather({...raw,hourly:{...raw.hourly,precipitation:[null]}},false).values.precipitation[0],null);assert.throws(()=>parseWeather({...raw,hourly:{...raw.hourly,temperature_2m:[]}},false));});

test('grid is bounded and does not manufacture unlimited requests',()=>{assert.equal(grid(113,-2,113.5,-1.5).length,9);assert.throws(()=>grid(100,-10,120,10));assert.throws(()=>grid(NaN,0,1,1));});

test('cache and deduplication retain one provider grid cell',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify([raw,raw]));};try{const locations=[{latitude:-2.1,longitude:113.8},{latitude:-2.2,longitude:113.8}];const signal=new AbortController().signal;const a=await loadWeather(locations,'2026-08-18',false,signal);await loadWeather(locations,'2026-08-18',false,signal);assert.equal(a.length,1);assert.equal(calls,1);}finally{globalThis.fetch=original;}});


test('aborted requests do not use cache and failed provider calls never synthesize values',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(loadWeather([{latitude:0,longitude:0}],'2026-08-18',false,controller.signal),{name:'AbortError'});
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:429});
 try{await assert.rejects(loadWeather([{latitude:1,longitude:1}],'2026-08-19',false,new AbortController().signal),/429/);}finally{globalThis.fetch=original;}
});
