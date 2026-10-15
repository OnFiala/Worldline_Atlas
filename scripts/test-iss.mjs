import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './local-db.mjs';
import {iss,issValidate,issEpoch,ISS_SOURCE,ISS_FETCH_INTERVAL,ISS_MAX_AGE} from '../worker/iss.mjs';
import {createOrbit,orbitPoint,orbitFresh,projectOrbit} from '../frontend/iss.js';
import {Globe} from '../frontend/globe.js';

const schema=await readFile(new URL('../drizzle/0001_iss_cache.sql',import.meta.url),'utf8');
const fixture=JSON.parse(await readFile(new URL('./fixtures/iss-demo.json',import.meta.url),'utf8'));
assert.equal(fixture.synthetic,true);const sample=fixture.elements;
const now=Date.parse('2026-10-15T15:45:00Z'),fresh=issValidate(sample,now);
assert.equal(issEpoch(fresh.EPOCH),Date.parse('2026-10-15T00:00:00.000Z'));
for(const epoch of ['2026-02-30T00:00:00','2026-10-15','2026-10-15T25:00:00','2026-10-15T02:41:34+02:00'])assert.throws(()=>issEpoch(epoch));
for(const change of [{NORAD_CAT_ID:1},{OBJECT_ID:'bad'},{EPOCH:'2026-10-16T02:00:00'},{MEAN_MOTION:100},{ECCENTRICITY:null},{INCLINATION:NaN}])assert.throws(()=>issValidate([{...sample[0],...change}],now));
assert.throws(()=>issValidate([],now));assert.throws(()=>issValidate([...sample,...sample],now));
assert.equal(orbitFresh('2026-10-14T15:45:00Z',now),true);assert.equal(orbitFresh('2026-10-14T15:44:59Z',now),false);assert.equal(orbitFresh('2026-10-16T00:00:00Z',now),false);

// Synthetic input tests exercise integration, not an independent accuracy certification.
const orbit=createOrbit(fresh),points=Array.from({length:121},(_,i)=>orbitPoint(orbit,now-600000+i*5000));
assert.ok(points.every(p=>p&&Math.abs(p.lat)<52&&Math.abs(p.lon)<=180&&p.height>300&&p.height<500));
assert.ok(Math.hypot(points[0].lat-points[120].lat,points[0].lon-points[120].lon)>5);
const globe={canvas:{clientWidth:800,clientHeight:700},lat:0,lon:0,distance:3.1,offset:[0,0],pos:Globe.prototype.pos,project:Globe.prototype.project};
assert.equal(projectOrbit(globe,{lat:0,lon:0,height:420}).visible,true);assert.equal(projectOrbit(globe,{lat:0,lon:180,height:420}).visible,false);
assert.equal(projectOrbit(globe,{lat:0,lon:80,height:420}).visible,true); // elevated horizon, not a surface dot

function newDb(){const DB=database();DB.db.exec(schema);DB.db.exec("CREATE TABLE research_canary(payload TEXT);INSERT INTO research_canary VALUES('unchanged original forecast')");return DB;}
const req=(path='/api/iss',opts={})=>new Request('https://site.test'+path,opts);
let calls=0;const fetcher=async(url,init)=>{calls++;assert.equal(url,ISS_SOURCE);assert.equal(init.redirect,'manual');assert.deepEqual(init.headers,{Accept:'application/json'});return new Response(JSON.stringify(sample));};
const DB=newDb();const get=async(time=now,fetchFn=fetcher)=>{const response=await iss(req('/api/iss',{headers:{Authorization:'not-forwarded',Cookie:'not-forwarded'}}),{DB},{now:time,fetcher:fetchFn});return {response,body:await response.json()};};
assert.equal((await iss(req('/api/iss',{method:'POST'}),{DB})).status,405);assert.equal((await iss(req('/api/iss?other=1'),{DB})).status,400);assert.equal((await iss(req('/api/iss',{headers:{Origin:'https://foreign.test'}}),{DB})).status,403);assert.equal(await iss(req('/api/other'),{DB}),null);
assert.equal((await iss(req('/api/iss',{method:'HEAD'}),{DB},{now,fetcher})).status,200);assert.equal(calls,0);
let result=await get();assert.equal(result.body.status,'available');assert.equal(result.body.fetchedAt,new Date(now).toISOString());assert.equal(calls,1);
await Promise.all(Array.from({length:12},()=>get(now+10000)));assert.equal(calls,1);
await get(now+ISS_FETCH_INTERVAL-1);assert.equal(calls,1);await get(now+ISS_FETCH_INTERVAL);assert.equal(calls,2);
const preserved=DB.db.prepare("SELECT payload,fetched_at FROM iss_cache").get();result=await get(now+2*ISS_FETCH_INTERVAL,async()=>{calls++;return new Response('do not repeat',{status:403});});assert.equal(result.body.fetchStopped,true);assert.equal(result.body.status,'available');
assert.deepEqual(DB.db.prepare("SELECT payload,fetched_at FROM iss_cache").get(),preserved);
result=await get(now+ISS_MAX_AGE+1000);assert.equal(result.body.status,'stale');assert.equal(result.body.elements,null);assert.equal(calls,3);assert.equal(DB.db.prepare('SELECT payload FROM research_canary').get().payload,'unchanged original forecast');
assert.equal((await get(now+10*ISS_MAX_AGE)).body.fetchStopped,true);assert.equal(calls,3);

const concurrentDb=newDb();let release,concurrentCalls=0;const barrier=new Promise(r=>release=r);
const blocking=async()=>{concurrentCalls++;await barrier;return new Response(JSON.stringify(sample));};
const first=iss(req(),{DB:concurrentDb},{now,fetcher:blocking});await new Promise(r=>setImmediate(r));
const followers=await Promise.all(Array.from({length:8},()=>iss(req(),{DB:concurrentDb},{now,fetcher:blocking})));
assert.equal(concurrentCalls,1);for(const r of followers)assert.equal((await r.json()).status,'pending');release();assert.equal((await(await first).json()).status,'available');
for(const failure of [async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.test'}}),async()=>new Response('bad json'),async()=>new Response(JSON.stringify([{...sample[0],NORAD_CAT_ID:1}])),async()=>{throw Error('network failure');}]){
 const db=newDb();let n=0;const fn=async(...args)=>{n++;return failure(...args);};const r=await iss(req(),{DB:db},{now,fetcher:fn});assert.equal((await r.json()).fetchStopped,true);await iss(req(),{DB:db},{now:now+ISS_FETCH_INTERVAL+1,fetcher:fn});assert.equal(n,1);
}
console.log('PASS: clearly synthetic orbital fixture; OMM propagation and 121-point trail; altitude horizon occlusion; invalid/future/stale suppression; one shared fetch per two hours; concurrent fetch exclusion; fixed origin/no credential forwarding; retained prior data and persistent stop after provider errors; canonical research canary unchanged.');
