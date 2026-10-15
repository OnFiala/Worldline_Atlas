import assert from 'node:assert/strict';
import {tileSpan,tileFor,tileKey,surfaceAt,visibleTiles} from '../frontend/imagery.js';
import {Globe} from '../frontend/globe.js';
import {imagery} from '../worker/imagery.mjs';
assert.equal(tileSpan(7),2.25);assert.deepEqual(tileFor(28,84,7),{z:7,row:27,col:117});
assert.deepEqual(tileFor(0,-180,7),tileFor(0,180,7));assert.equal(tileFor(-90,0,7).row,79);
for(const [lat,lon] of [[28,84],[49,31],[26,56],[0,179],[-79,-179]])for(const [w,h] of [[755,633],[390,580]])for(const distance of [3.1,1.08]){
 const g={canvas:{clientWidth:w,clientHeight:h,height:h*2},lat,lon,distance,offset:w<600?[0,-.12]:[.1,-.1],pos:Globe.prototype.pos};
 const p=Globe.prototype.project.call(g,lat,lon,1),q=surfaceAt(g,p.x,p.y);assert.ok(Math.abs(q.lat-lat)<1e-8&&Math.abs(q.lon-lon)<1e-8);
 const near=visibleTiles(g,7);assert.ok(near.length>0);for(const t of near){const span=tileSpan(t.z);assert.ok(t.row>=0&&t.row<Math.ceil(180/span)&&t.col>=0&&t.col<Math.ceil(360/span));}
}
let calls=0;const old=globalThis.fetch;globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/7/27/117.jpeg');assert.equal(init.redirect,'manual');assert.ok(init.signal instanceof AbortSignal);assert.equal('cf' in init,false);assert.deepEqual(Object.keys(init.headers),['Accept']);return new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});};
assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg',{headers:{Authorization:'not-forwarded'}}))).status,200);
for(const path of ['3/NaN/NaN','4/NaN/NaN','7/80/0','7/0/160','8/0/0','2/3/0','2/0/5','2/-1/0','https://elsewhere'])assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/'+path+'.jpg'))).status,404);
assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg',{method:'POST'}))).status,405);assert.equal(calls,1);
Object.defineProperty(globalThis,'caches',{configurable:true,get(){throw new Error('Cache API unavailable in dispatch');}});assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'))).status,200);delete globalThis.caches;
globalThis.caches={default:{match:async()=>{throw Error('Cache match unavailable');}}};assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'))).status,200);delete globalThis.caches;
globalThis.caches={default:{match:async()=>null,put:async()=>{throw Error('Cache write unavailable');}}};const waits=[];assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'),{waitUntil:p=>waits.push(p)})).status,200);await Promise.all(waits);delete globalThis.caches;
const savedTimeout=AbortSignal.timeout;AbortSignal.timeout=undefined;assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'))).status,200);AbortSignal.timeout=savedTimeout;
globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://example.invalid/'}});assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'))).status,502);
globalThis.fetch=async()=>new Response('no',{status:503});assert.equal((await imagery(new Request('https://site.test/imagery/blue-marble/7/27/117.jpg'))).status,502);globalThis.fetch=old;
console.log('PASS: CRS84 matrix bounds, antimeridian/poles, 20 projection round trips, visible tile bounds, fixed upstream/no credential forwarding fallback, and unavailable/throwing platform cache.');
