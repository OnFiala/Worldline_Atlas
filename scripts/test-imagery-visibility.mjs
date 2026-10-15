import assert from 'node:assert/strict';
import {Imagery,tileFor,tileKey,surfaceAt,visibleTiles} from '../frontend/imagery.js';
import {Globe} from '../frontend/globe.js';

// Exercise the actual paused Globe.tick and imagery queue without WebGL or network.
const saved={fetch:globalThis.fetch,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame};
const requests=[];let aborted=0;
globalThis.document={querySelector:()=>({textContent:''})};
globalThis.requestAnimationFrame=()=>0;
globalThis.fetch=(url,{signal})=>{
 assert.match(url,/^\/imagery\/blue-marble\/[2-7]\/\d+\/\d+\.jpg$/);
 requests.push(url);
 return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(new DOMException('Aborted','AbortError'));},{once:true}));
};
const noop=()=>{};
const gl={getParameter:()=>4096,createTexture:()=>({}),activeTexture:noop,bindTexture:noop,texImage2D:noop,texParameteri:noop};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
try{
 for(const [width,height] of [[1280,760],[390,510]]){
  const g={canvas:{clientWidth:width,clientHeight:height,width:width*2,height:height*2,dataset:{}},lat:24,lon:24,distance:3.1,offset:[0,-.1],visible:true,rotating:false,reduced:false,target:null,last:0};
  const layer=g.imagery=new Imagery(gl,noop),cached=tileFor(24,24,2);
  layer.loaded.set(tileKey(cached),{...cached,slot:0,used:0});
  const baseline=requests.length;
  Globe.prototype.tick.call(g,1000);
  assert.ok(requests.length>baseline,'The visible, paused globe must request valid detail tiles');
  const visibleRequests=requests.length,initialPending=layer.pending.size,abortsBefore=aborted;
  assert.ok(initialPending>0);

  // Accessible list sets display:none: both CSS dimensions become zero,
  // while the drawing buffer retains its previous non-zero dimensions.
  g.canvas.clientWidth=0;g.canvas.clientHeight=0;
  Globe.prototype.tick.call(g,1016); // Deliberately inside the 300 ms plan throttle.
  await settle();
  assert.equal(requests.length,visibleRequests,'Hiding must not produce even one NaN request');
  assert.equal(aborted-abortsBefore,initialPending,'Cancel detail fetches hidden by list mode');
  assert.equal(layer.pending.size,0);assert.equal(layer.queue.length,0);assert.equal(layer.needed,0);
  assert.equal(layer.failures,0,'Intentional cancellation is not an imagery failure');
  assert.ok(layer.loaded.has(tileKey(cached)),'Keep the useful cache through list mode');
  Globe.prototype.tick.call(g,62000);
  await settle();assert.equal(requests.length,visibleRequests,'No retry traffic while hidden');

  g.canvas.clientWidth=width;g.canvas.clientHeight=height;
  Globe.prototype.tick.call(g,62001);
  assert.ok(requests.length>visibleRequests,'Resume valid loading immediately on return');
  assert.ok(layer.needed>0);assert.ok(layer.loaded.has(tileKey(cached)));

  // Independently guard callers with bad camera/layout inputs.
  for(const [field,bad] of [['lat',NaN],['lon',Infinity],['distance',NaN],['distance',1]]){
   const original=g[field];g[field]=bad;
   const count=requests.length;layer.plan(g,63000);await settle();
   assert.equal(requests.length,count);assert.deepEqual(visibleTiles(g,3),[]);assert.equal(surfaceAt(g,0,0),null);
   g[field]=original;
  }
  for(const [w,h] of [[0,height],[width,0],[Infinity,height],[width,NaN]]){
   g.canvas.clientWidth=w;g.canvas.clientHeight=h;
   assert.deepEqual(visibleTiles(g,3),[]);assert.equal(surfaceAt(g,0,0),null);
  }
  g.canvas.clientWidth=width;g.canvas.clientHeight=height;
  assert.equal(surfaceAt(g,NaN,0),null);
  assert.equal(surfaceAt({...g,offset:undefined},0,0),null);
  g.visible=false;layer.plan(g,64000);await settle();
  assert.equal(layer.pending.size,0);

  // A malformed queued tile must be rejected at the final fetch boundary too.
  const badTiles=[{z:3,row:NaN,col:NaN},{z:4,row:0,col:Infinity},{z:7,row:80,col:0},{z:2,row:0,col:-1},{z:8,row:0,col:0}];
  layer.queue=badTiles;layer.wanted=new Set(badTiles.map(tileKey));
  const count=requests.length;layer.pump();assert.equal(requests.length,count);assert.equal(layer.pending.size,0);
 }
 for(const [lat,lon,z] of [[NaN,0,3],[0,Infinity,3],[0,0,NaN],[0,0,8]])assert.equal(tileFor(lat,lon,z),null);
 console.log('PASS: desktop/mobile paused globe → zero-size list → globe; no NaN/retry requests, canceled hidden fetches, cache retained, immediate valid resume; invalid camera/layout/coordinates and queued tile bounds rejected.');
}finally{
 for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
