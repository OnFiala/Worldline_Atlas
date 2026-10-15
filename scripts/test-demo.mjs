import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoHandler} from './local-server.mjs';
import {api} from '../worker/api.mjs';
import {renderPage} from '../frontend/pages.js';

const oldFetch=globalThis.fetch;
globalThis.fetch=()=>{throw Error('External network use is forbidden in demo tests');};
const demo=await createDemoHandler();
const get=path=>demo.handler(new Request('http://127.0.0.1:8797'+path));
try{
 const snapshot=await(await get('/api/snapshot')).json();
 assert.equal(snapshot.events.length,1);assert.equal(snapshot.sources.length,2);assert.equal(snapshot.predictions.length,1);
 assert.equal(snapshot.localPreview,true);assert.match(snapshot.events[0].title,/Fictional/);
 for(const route of ['/connections','/forecasts','/performance','/methodology']){
  const page=renderPage(route,snapshot,r=>'<p>'+r.title+'</p>');
  assert.ok(page.length>100);assert.ok(!page.includes('undefined'));
 }
 assert.ok([...snapshot.events,...snapshot.sources,...snapshot.predictions,...snapshot.nodes,...snapshot.relations].every(x=>x.id.startsWith('DEMO-')));
 for(const route of ['/','/connections','/forecasts','/performance','/methodology']){const r=await get(route);assert.equal(r.status,200);assert.match(await r.text(),/All research records are fictional/);}
 for(const path of ['/app.js','/globe.js','/iss.js','/style.css','/vendor/satellite-6.0.1.js'])assert.equal((await get(path)).status,200);
 assert.equal((await get('/assets/earth.jpg')).status,404);
 assert.equal((await get('/imagery/blue-marble/2/0/0.jpg')).status,404);
 const orbit=await(await get('/api/iss')).json();assert.equal(orbit.status,'disabled');assert.equal(orbit.elements,null);
 assert.equal((await demo.handler(new Request('http://127.0.0.1:8797/api/ingest',{method:'POST'}))).status,403);
 assert.equal((await demo.handler(new Request('http://127.0.0.1:8797/api/snapshot',{headers:{origin:'https://foreign.invalid'}}))).status,403);
 assert.equal((await get('/%2e%2e%2fLICENSE')).status,404);
 let touchedDatabase=false;
 const DB={prepare(){touchedDatabase=true;throw Error('Unauthorized writes must not touch the DB');}};
 const denied=await api(new Request('https://test.invalid/api/ingest',{method:'POST',headers:{'Content-Type':'application/json','X-Write-Authorized':'true'},body:JSON.stringify({WRITE_AUTHORIZED:true,writerRole:'integrator'})}),{DB});
 assert.equal(denied.status,403);assert.equal(touchedDatabase,false);
 const html=await readFile(new URL('../frontend/index.html',import.meta.url),'utf8');
 const globe=await readFile(new URL('../frontend/globe.js',import.meta.url),'utf8');
 assert.ok(!/<(?:script|img|link)[^>]+(?:src|href)="https?:/i.test(html));
 assert.ok(!globe.includes("img.src="));assert.ok(!globe.includes('new Imagery('));
 console.log('PASS: synthetic demo initializes from a clean checkout; routes and assets; read-only HTTP; trusted writer boundary; no external provider calls; omitted image unavailable; disconnected ISS; traversal and foreign-origin rejection.');
}finally{demo.close();globalThis.fetch=oldFetch;}
