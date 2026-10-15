import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {api,publicationGate} from '../worker/api.mjs';import {database} from './local-db.mjs';
const DB=database();DB.db.exec(await readFile(new URL('../drizzle/0000_atlas.sql',import.meta.url),'utf8'));let sequence=0;
const post=(records,options={})=>{const body={run:{id:'test-'+(++sequence),startedAt:new Date().toISOString(),status:'succeeded',writerRole:'integrator',summary:'Automated verification'},records,...options.body};return api(new Request('https://atlas.test/api/ingest',{method:'POST',headers:{'content-type':'application/json',...options.headers},body:JSON.stringify(body)}),{DB,WRITE_AUTHORIZED:true});};
const rec=(kind,id,data,expectedVersion=0)=>({kind,id,data:{id,...data},expectedVersion});
const count=()=>DB.db.prepare('SELECT count(*) AS n FROM records').get().n;
const access={readScope:'relevant_body',readEvidence:{verifier:'isolated-test',readAt:'2026-10-15',locator:'Test fixture body',summary:'Synthetic exact-claim evidence, no real-world assertion'}};
const src=(id,family)=>rec('source',id,{title:id,url:'https://example.org/'+id,originFamily:family,...access});
assert.equal((await post([src('S-A','origin-a'),src('S-B','origin-b')])).status,201);
const claim='An exact claim for a defined time';const event=rec('event','E-A',{title:'Case',lat:20,lon:30,locationType:'regional anchor',sourceIds:['S-A','S-B'],publicationClaim:claim,publicationEvidence:[{sourceId:'S-A',claimSupported:claim,credible:true,independenceReviewed:true,temporalMatch:true}]});
assert.equal((await post([event])).status,201);
let snapshot=await (await api(new Request('https://atlas.test/api/snapshot'),{DB,WRITE_AUTHORIZED:true})).json();assert.equal(snapshot.events.length,0);assert.equal(snapshot.watchlist.length,1);
event.expectedVersion=1;event.data.publicationEvidence.push({sourceId:'S-B',claimSupported:claim,credible:true,independenceReviewed:true,temporalMatch:true});assert.equal((await post([event])).status,201);
snapshot=await (await api(new Request('https://atlas.test/api/snapshot'),{DB,WRITE_AUTHORIZED:true})).json();assert.equal(snapshot.events.length,1);
const before=count();assert.equal((await post([event])).status,409);assert.equal(count(),before);
assert.equal((await post([src('S-X','x')],{headers:{origin:'https://other.test'}})).status,403);assert.equal(count(),before);
assert.equal((await post([],{body:{run:{id:'collector',startedAt:new Date().toISOString(),status:'succeeded',writerRole:'collector'},records:[]}})).status,403);
assert.equal((await post([src('S-Z','z')],{body:{run:{id:'failed-data',startedAt:new Date().toISOString(),status:'failed',writerRole:'integrator'},records:[src('S-Z','z')]}})).status,400);assert.equal(count(),before);
const prediction=rec('prediction','P-A',{statement:'A precisely defined future outcome',issuedAt:'2026-10-15',issuer:'Test',probability:.6,targetPeriod:{from:'2099-01-01',to:'2099-12-31'},resolutionCriteria:'Declared source and threshold',status:'Unresolved',outcome:null,brierScore:null,sourceIds:['S-A'],baselineProbability:.5});
assert.equal((await post([prediction])).status,201);const frozenCount=count();
assert.equal((await post([{...prediction,expectedVersion:1,data:{...prediction.data,probability:.8}}])).status,409);assert.equal(count(),frozenCount);
assert.equal((await post([{...prediction,expectedVersion:1,data:{...prediction.data,baselineProbability:.4}}])).status,409);
assert.equal((await post([{...prediction,expectedVersion:1,data:{...prediction.data,status:'resolved'}}])).status,409);
assert.equal((await post([{...prediction,expectedVersion:1,data:{...prediction.data,outcome:1,resolutionEvidence:['S-A']}}])).status,409);assert.equal(count(),frozenCount);
assert.equal((await post([rec('source','S-B',{title:'B withdrawn',url:'https://example.org/b',originFamily:'origin-b',status:'withdrawn',...access},1)])).status,201);
snapshot=await (await api(new Request('https://atlas.test/api/snapshot'),{DB,WRITE_AUTHORIZED:true})).json();assert.equal(snapshot.events.length,0);assert.equal(snapshot.watchlist.length,1);
const duplicated=publicationGate(event.data,[{id:'S-A',originFamily:'same',...access},{id:'S-B',originFamily:'same',...access}]);assert.equal(duplicated.approved,false);
assert.equal(publicationGate({...event.data,publicationEvidence:event.data.publicationEvidence.map(e=>({...e,temporalMatch:false}))},[{id:'S-A',originFamily:'a',...access},{id:'S-B',originFamily:'b',...access}]).approved,false);
assert.equal((await post([rec('source','S-B',{title:'B corrected',url:'https://example.org/b',originFamily:'origin-a',status:'active',...access},2)])).status,201);
snapshot=await (await api(new Request('https://atlas.test/api/snapshot'),{DB,WRITE_AUTHORIZED:true})).json();assert.equal(snapshot.events.length,0);
assert.ok(DB.db.prepare("SELECT count(*) AS n FROM runs WHERE status='failed'").get().n>=7);
const history=await (await api(new Request('https://atlas.test/api/history?kind=event&id=E-A'),{DB,WRITE_AUTHORIZED:true})).json();assert.equal(history.versions.length,2);assert.equal(history.versions[0].publicationEvidence.length,1);
console.log('PASS: persisted append/readback, one-origin gate, two-origin gate, syndication dedupe, source withdrawal/correction demotion, time mismatch, revision conflict, cross-origin/role denial, failed-run data protection, forecast and baseline immutability, status/outcome early-resolution rejection, preserved versions, rejection audit.');

const sources=[{id:'S-A',originFamily:'a',version:1,...access},{id:'S-B',originFamily:'b',version:1,...access}];
const primary={publicationClaim:claim,evidenceMode:'primary_plus_context_check',primaryEvidence:{sourceId:'S-A',category:'measurement',claimSupported:claim,authoritative:true,authenticityReviewed:true,interpretationReviewed:true,temporalMatch:true},contextEvidence:[{sourceId:'S-B',independent:true,authenticity:true,context:true,interpretation:true,checkedAt:'2026-10-15'}]};
assert.equal(publicationGate(primary,sources).approved,true);
assert.equal(publicationGate(primary,sources.map(s=>({...s,originFamily:null}))).approved,false);
assert.equal(publicationGate(primary,sources.map(s=>({...s,version:2}))).approved,false);
assert.equal(publicationGate(event.data,sources.map(s=>({...s,readScope:'snippet_only'}))).approved,false);
assert.equal(publicationGate(primary,sources.map(s=>({...s,readScope:'blocked'}))).approved,false);
assert.equal(publicationGate(event.data,sources).approved,true); // accessible independent replacement preserves the signal
const past=rec('prediction','P-PAST',{...prediction.data,id:'P-PAST',targetPeriod:{from:'2000-01-01',to:'2000-12-31'},decisionSourceId:'S-A'});
assert.equal((await post([past])).status,201);
const evaluation={...past,expectedVersion:1,data:{...past.data,status:'resolved',outcome:1,brierScore:0,resolutionEvidence:['S-A'],resolvedAt:new Date().toISOString(),resolutionDecision:{criterionMet:false,criterion:past.data.resolutionCriteria}}};
assert.equal((await post([evaluation])).status,409);
assert.equal((await post([{...evaluation,data:{...evaluation.data,status:'ambiguous',resolutionDecision:null}}])).status,409);
evaluation.data.resolutionDecision.criterionMet=true;assert.equal((await post([evaluation])).status,201);
const scored=await (await api(new Request('https://atlas.test/api/history?kind=prediction&id=P-PAST'),{DB,WRITE_AUTHORIZED:true})).json();assert.ok(Math.abs(scored.versions[1].brierScore-.16)<1e-12);
const countBefore=count();assert.equal((await post([rec('prediction','P-BAD',{...prediction.data,id:'P-BAD',targetPeriod:{to:'not-a-date'}})])).status,400);assert.equal(count(),countBefore);
console.log('PASS: primary/context gate, missing-family denial, source-version re-review, snippet/blocked watchlist and accessible replacement, criterion mismatch, ambiguous scoring denial, server Brier recomputation and malformed date rejection.');

for(const readScope of [undefined,null,'unknown','supplied_research_notes','unexpected','snippet_only','headline_only','blocked','unread']){assert.equal(publicationGate(event.data,sources.map(s=>({...s,readScope}))).approved,false);assert.equal(publicationGate(primary,sources.map(s=>({...s,readScope}))).approved,false);}
for(const readEvidence of [undefined,{}, {...access.readEvidence,verifier:''},{...access.readEvidence,readAt:'2026-02-31'},{...access.readEvidence,summary:''}])assert.equal(publicationGate(event.data,sources.map(s=>({...s,readEvidence}))).approved,false);
for(const period of [{from:'2026-01-01',to:'2026-02-31'},{from:'2026-02-29',to:'2026-03-01'},{from:'2026-03-02',to:'2026-03-01'}])assert.equal((await post([rec('prediction','P-CALENDAR-'+sequence,{...prediction.data,id:'P-CALENDAR-'+sequence,targetPeriod:period})])).status,400);
const invalidDecision={...evaluation,expectedVersion:2};for(const resolvedAt of ['not-a-date','2026-02-31T00:00:00Z','2000-01-01T00:00:00Z','2099-01-01T00:00:00Z','2026-01-01T25:00:00Z'])assert.equal((await post([{...invalidDecision,data:{...invalidDecision.data,resolvedAt}}])).status,409);
for(const value of [null,[],true,'text']){const before=count(),audit=DB.db.prepare('SELECT count(*) AS n FROM runs').get().n;const response=await api(new Request('https://atlas.test/api/ingest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),{DB,WRITE_AUTHORIZED:true});assert.equal(response.status,400);assert.equal(count(),before);assert.equal(DB.db.prepare('SELECT count(*) AS n FROM runs').get().n,audit+1);}
console.log('PASS: QA F1–F3 regressions: unknown/unrecorded reads refused, actual calendar and resolution timing validated, null/array/scalar envelopes return 400 with audit and no record writes.');
