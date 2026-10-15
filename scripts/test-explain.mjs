import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {explanation,renderExplanation,renderChain,renderCoverage,caseType,relatedEvents} from '../frontend/explain.js';
import {api} from '../worker/api.mjs';
import {database} from './local-db.mjs';

const e={id:'E-TEST',title:'A dated flood',publicationClaim:'A flood interrupted access on 10 October.',summary:'Longer original note.',sectors:['Transport'],region:'Test region',relationIds:['R-TEST'],status:'Verified qualitative event'};
const r={id:'R-TEST',fromNode:'road_id',toNode:'supply_id',mechanism:'Broken links may delay deliveries.',eventIds:[],indicators:[{name:'Delivery time'}],edges:[{fromNode:'road_id',toNode:'supply_id',mechanism:'Broken links may delay deliveries.'}]};
const d={events:[e],watchlist:[{title:'Unverified lead'}],relations:[r],nodes:[{id:'road_id',title:'Road access'},{id:'supply_id',title:'Household supplies'}]};
const before=JSON.stringify(d);
assert.equal(explanation(e,d).whatHappened,e.publicationClaim);
assert.equal(explanation(e,d).howEffectsSpread,r.mechanism);
assert.match(explanation(e,d).whatToWatch,/Delivery time/);
assert.deepEqual(relatedEvents(r,d),[e]); // Event-side relation links also count.
assert.match(explanation(r,d,'relation').whyItMatters,/Household supplies/);
const supplied={whatHappened:'Observed change.',whyItMatters:'People depend on the route.',howEffectsSpread:'If access stays closed, deliveries may slow.',whatToWatch:'Delivery times next week.'};
for(const kind of ['event','relation'])assert.deepEqual(explanation({...e,...r,...supplied},d,kind),supplied);
for(const bad of [null,' ',17,{},[]])assert.equal(explanation({...e,whatHappened:bad},d).whatHappened,e.publicationClaim);
assert.match(renderExplanation({...e,whatHappened:'<script>unsafe()</script>'},d),/&lt;script&gt;/);
assert.ok(!renderExplanation({...e,whatHappened:'<script>unsafe()</script>'},d).includes('<script>'));
const chain=renderChain(r,d);assert.match(chain,/Road access/);assert.match(chain,/Household supplies/);assert.ok(!chain.includes('road_id'));
assert.match(renderExplanation(r,d,'relation'),/Possible effect/);
assert.match(explanation(r,{...d,events:[]},'relation').whatHappened,/No source-checked initiating case/);
assert.match(renderCoverage(d),/Partial coverage · 1 reviewed cases/);assert.match(renderCoverage(d),/Missing markers do not mean/);
assert.match(renderCoverage({...d,events:[]}),/No case has completed/);
assert.equal(caseType({...e,contextType:'ongoing_context'}),'Ongoing context');
assert.equal(caseType({...e,status:'Verified monthly estimate'}),'Dated observation');
assert.equal(caseType({...e,contextType:'ongoing_conflict_context'}),'Ongoing context');
assert.equal(caseType({...e,contextType:'dated_hazard_context'}),'Dated hazard context');
assert.equal(JSON.stringify(d),before);

// The existing API must preserve the agreed optional prose, without a schema change.
const DB=database();DB.db.exec(await readFile(new URL('../drizzle/0000_atlas.sql',import.meta.url),'utf8'));
const relation={...r,...supplied,title:'Possible delay',horizon:'Next week',lastVerifiedAt:'2026-10-15',confidence:{level:'Low',reason:'Synthetic test'},timeValidity:{fromDate:'2026-10-15'},status:'Unresolved',conditions:[],sectors:[],regions:[],sourceIds:[],indicators:[],alternatives:[],confirmationCriteria:[],falsificationCriteria:[],counterEvidence:[],edges:[]};
const event={...e,...supplied,contextType:'ongoing_context',lat:1,lon:2,locationType:'Regional anchor',sourceIds:[]};
const response=await api(new Request('https://atlas.test/api/ingest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({run:{id:'clarity-fixture',startedAt:new Date().toISOString(),status:'succeeded',writerRole:'integrator'},records:[{kind:'event',id:e.id,expectedVersion:0,data:event},{kind:'relation',id:r.id,expectedVersion:0,data:relation}]})}),{DB,WRITE_AUTHORIZED:true});
assert.equal(response.status,201,await response.text());
for(const [kind,id] of [['event',e.id],['relation',r.id]]){
 const history=await(await api(new Request(`https://atlas.test/api/history?kind=${kind}&id=${id}`),{DB,WRITE_AUTHORIZED:true})).json();
 for(const key of Object.keys(supplied))assert.equal(history.versions[0][key],supplied[key]);
}
console.log('PASS: four plain-text fields on event/relation, safe legacy and invalid-type fallbacks, readable node labels, escaped HTML, explicit uncertain effects, ongoing context, dynamic coverage, immutable input and existing API round-trip. Isolated in-memory data only.');
