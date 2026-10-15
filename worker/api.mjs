const KINDS = new Set(['event','source','relation','prediction','node']);
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});}
function problem(message,status=400){return json({error:message},status);}
function unpack(row){return {...JSON.parse(row.payload),id:row.id,version:row.version,recordedAt:row.recorded_at};}
function realDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function realMoment(value){if(realDate(value))return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;return realDate(value.slice(0,10))&&Number(value.slice(11,13))<24&&Number(value.slice(14,16))<60&&Number(value.slice(17,19))<60&&Number.isFinite(Date.parse(value));}
function sourceUsable(s){
 if(!s||['withdrawn','contested'].includes(s.status))return false;
 const evidence=s.readEvidence;
 return ['full_text','relevant_body','dataset'].includes(s.readScope)&&evidence&&typeof evidence.verifier==='string'&&evidence.verifier.trim()&&realMoment(evidence.readAt)&&typeof evidence.locator==='string'&&evidence.locator.trim()&&typeof evidence.summary==='string'&&evidence.summary.trim();
}
function reviewRelation(r,sources){const ids=new Set([...(r.sourceIds??[]),...(r.edges??[]).flatMap(e=>e.sourceIds??[])]);const affected=[...ids].filter(id=>!sourceUsable(sources.find(s=>s.id===id)));if(affected.length){r.evidenceReview={required:true,affectedSourceIds:affected,storedStatus:r.status,reason:'Source-body access or source standing requires renewed review; preserved edge labels are historical claims, not renewed verification.'};r.status='Review required';}return r;}
export function publicationGate(event,sources){
 if(event.evidenceMode==='primary_plus_context_check'){
  const p=event.primaryEvidence,s=sources.find(s=>s.id===p?.sourceId),ok=!!event.publicationClaim&&sourceUsable(s)&&s.originFamily&&(p.sourceVersion??1)===(s.version??1)&&!['withdrawn','contested'].includes(s.status)&&p?.authoritative&&p.claimSupported===event.publicationClaim&&p.authenticityReviewed&&p.interpretationReviewed&&p.temporalMatch&&['measurement','official_decision'].includes(p.category);
  const context=(event.contextEvidence??[]).filter(c=>{const t=sources.find(t=>t.id===c.sourceId);return sourceUsable(t)&&t.originFamily&&(c.sourceVersion??1)===(t.version??1)&&!['withdrawn','contested'].includes(t.status)&&t.originFamily!==s?.originFamily&&c.independent&&c.authenticity&&c.context&&c.interpretation&&c.checkedAt;});
  return {approved:!!ok&&context.length>0,evidenceMode:'primary_plus_context_check',independentOrigins:ok?1:0,sourceIds:ok?[s.id,...context.map(c=>c.sourceId)]:[],claim:event.publicationClaim??null,reason:ok&&context.length?'One authoritative origin plus independent authenticity, context and interpretation review; not a second measurement':'Watchlist: primary-source or independent-context checks incomplete'};
 }
 const families=new Set(),accepted=[];
 for(const evidence of event.publicationEvidence??[]){const s=sources.find(s=>s.id===evidence.sourceId);if(!sourceUsable(s)||(evidence.sourceVersion??1)!==(s.version??1)||['withdrawn','contested'].includes(s.status)||!s.originFamily||!evidence.credible||!evidence.independenceReviewed||!evidence.temporalMatch||evidence.claimSupported!==event.publicationClaim)continue;families.add(s.originFamily);accepted.push(s.id);}
 return {approved:!!event.publicationClaim&&families.size>=2,evidenceMode:'two_independent_origins',independentOrigins:families.size,sourceIds:accepted,claim:event.publicationClaim??null,reason:families.size>=2?'Two reviewed independent origins support the stated claim and period':'Watchlist: fewer than two reviewed independent origins for this exact claim and period'};
}
const currentSQL = 'SELECT r.* FROM records r JOIN (SELECT kind,id,MAX(version) AS v FROM records GROUP BY kind,id) x ON r.kind=x.kind AND r.id=x.id AND r.version=x.v';
async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const canonical=v=>JSON.stringify(v);
function validateRecord(r){
 if(!r||!KINDS.has(r.kind)||!/^[-\w]{1,80}$/.test(r.id)||!Number.isInteger(r.expectedVersion)||r.expectedVersion<0||!r.data||r.data.id!==r.id) return 'Invalid record identity or expectedVersion';
 if(JSON.stringify(r.data).length>60000)return 'Record too large';
 if(r.kind==='source'&&(!r.data.url||!/^https:\/\//.test(r.data.url)||!r.data.title))return 'Source requires title and HTTPS URL';
 if(r.kind==='event'&&(!r.data.title||!Number.isFinite(r.data.lat)||Math.abs(r.data.lat)>90||!Number.isFinite(r.data.lon)||Math.abs(r.data.lon)>180||!r.data.locationType))return 'Event requires title and qualified coordinates';
 if(r.kind==='relation'){
   for(const key of ['fromNode','toNode','mechanism','horizon','lastVerifiedAt'])if(!r.data[key])return 'Relation requires '+key;
   for(const key of ['conditions','sectors','regions','sourceIds','indicators','alternatives','confirmationCriteria','falsificationCriteria','counterEvidence'])if(!Array.isArray(r.data[key]))return 'Relation requires array '+key;
   if(!r.data.confidence||!r.data.timeValidity||!r.data.status)return 'Relation needs confidence, validity and status';
 }
 if(r.kind==='prediction'){
  if(!['Unresolved','pending','resolved','ambiguous','void'].includes(r.data.status))return 'Invalid prediction status';
  if(!r.data.statement||!realMoment(r.data.issuedAt)||!realDate(r.data.targetPeriod?.to)||!realDate(r.data.targetPeriod?.from)||r.data.targetPeriod.from>r.data.targetPeriod.to||!r.data.resolutionCriteria)return 'Prediction requires frozen statement, dates and resolution rule';
  if(r.data.probability!=null&&(!Number.isFinite(r.data.probability)||r.data.probability<0||r.data.probability>1))return 'Probability must be 0–1 or unquantified';
 }
 return null;
}
export async function api(request,env){
 const u=new URL(request.url);
 if(!u.pathname.startsWith('/api/'))return null;
 if(!env.DB)return problem('Database is not connected; the last stored state is unchanged.',503);
 if(request.method==='GET'){
  if(u.pathname==='/api/snapshot'){
   const rows=await env.DB.prepare(currentSQL).all();
   const runs=await env.DB.prepare('SELECT * FROM runs ORDER BY recorded_at DESC,rowid DESC LIMIT 1').all();
   const success=await env.DB.prepare("SELECT * FROM runs WHERE status='succeeded' ORDER BY recorded_at DESC,rowid DESC LIMIT 1").all();
   const data={events:[],sources:[],relations:[],predictions:[],nodes:[],watchlist:[],lastRun:runs.results[0]??null,lastSuccess:success.results[0]??null,servedAt:new Date().toISOString(),localPreview:env.LOCAL_PREVIEW===true};
   const map={event:'events',source:'sources',relation:'relations',prediction:'predictions',node:'nodes'};
   for(const row of rows.results)data[map[row.kind]].push(unpack(row));
   data.events=data.events.filter(e=>{e.publicationGate=publicationGate(e,data.sources);if(e.publicationGate.approved)return true;data.watchlist.push(e);return false;});
   for(const r of data.relations)reviewRelation(r,data.sources);
   return json(data);
  }
  if(u.pathname==='/api/relations'){
   const q=(u.searchParams.get('q')??'').slice(0,200).toLocaleLowerCase();
   const rows=await env.DB.prepare(currentSQL+" WHERE r.kind='relation'").all();
   const sources=await env.DB.prepare(currentSQL+" WHERE r.kind='source'").all();
   return json({relations:rows.results.map(unpack).map(r=>reviewRelation(r,sources.results.map(unpack))).filter(r=>!q||JSON.stringify(r).toLocaleLowerCase().includes(q))});
  }
  if(u.pathname==='/api/history'){
   const kind=u.searchParams.get('kind'),id=u.searchParams.get('id');
   if(!KINDS.has(kind)||!/^[-\w]{1,80}$/.test(id??''))return problem('Invalid history key');
   const rows=await env.DB.prepare('SELECT * FROM records WHERE kind=? AND id=? ORDER BY version').bind(kind,id).all();
   return json({kind,id,versions:rows.results.map(unpack)});
  }
  if(u.pathname==='/api/health')return json({ok:!!await env.DB.prepare('SELECT 1 AS ok FROM records LIMIT 1').first(),storage:'D1',time:new Date().toISOString()});
  return problem('Not found',404);
 }
 if(request.method!=='POST'||u.pathname!=='/api/ingest')return problem('Method not allowed',405);
 const reject=async(message,status=400)=>{try{await env.DB.prepare('INSERT INTO runs(id,status,started_at,recorded_at,duration_ms,usage_json,summary,payload_hash,record_count) VALUES(?,?,?,?,?,?,?,?,?)').bind('rejected-'+crypto.randomUUID(),'failed',new Date().toISOString(),new Date().toISOString(),null,null,'Rejected import: '+message,'rejected',0).run();}catch{}return problem(message,status);};
 // Only a trusted server adapter may authorize writes, after authenticating its caller.
 // Never derive this flag from request headers, query parameters, or the JSON body.
 if(env.WRITE_AUTHORIZED!==true)return problem('Writes require trusted server authorization',403);
 const origin=request.headers.get('origin');
 if(origin&&origin!==u.origin)return reject('Cross-origin writes are not allowed',403);
 if(!(request.headers.get('content-type')??'').startsWith('application/json'))return reject('Expected application/json',415);
 if(Number(request.headers.get('content-length')||0)>700000)return reject('Import too large',413);
 const raw=await request.text(); if(raw.length>700000)return reject('Import too large',413);
 let body;try{body=JSON.parse(raw);}catch{return reject('Invalid JSON');}
 if(!body||typeof body!=='object'||Array.isArray(body))return reject('Import envelope must be a JSON object');
 const {run,records=[]}=body;
 if(!run||!/^[-\w]{1,100}$/.test(run.id)||!['succeeded','failed'].includes(run.status)||!realMoment(run.startedAt)||!Array.isArray(records)||records.length>150)return reject('Invalid run or record count');
 if(!['integrator','evaluator'].includes(run.writerRole))return reject('Declared writer scope cannot write canonical research',403);
 if(run.writerRole==='evaluator'&&records.some(r=>r.kind!=='prediction'||r.expectedVersion<1))return reject('Evaluator scope can only append evaluations to existing predictions',403);
 if(run.status==='failed'&&records.length)return reject('Failed runs cannot modify good data');
 const hash=await digest(raw),previous=await env.DB.prepare('SELECT payload_hash,status FROM runs WHERE id=?').bind(run.id).first();
 if(previous)return previous.payload_hash===hash?json({ok:true,idempotent:true,runId:run.id,status:previous.status}):reject('Run ID already belongs to a different payload',409);
 const seen=new Set();
 for(const r of records){const e=validateRecord(r);if(e)return reject(e);const key=r.kind+':'+r.id;if(seen.has(key))return reject('Duplicate record in batch');seen.add(key);}
 const now=new Date().toISOString(), statements=[];
 for(const r of records){
  const old=await env.DB.prepare('SELECT * FROM records WHERE kind=? AND id=? ORDER BY version DESC LIMIT 1').bind(r.kind,r.id).first();
  if((old?.version??0)!==r.expectedVersion)return reject('Version conflict for '+r.id+'; read latest before retrying',409);
  if(r.kind==='prediction'&&old){
   const before=JSON.parse(old.payload);
   const mutable=new Set(['status','outcome','brierScore','mae','intervalCovered','resolutionEvidence','resolvedAt','resolutionDecision','revisionNote','lessons','version','recordedAt']);
   for(const key of new Set([...Object.keys(before),...Object.keys(r.data)]))if(!mutable.has(key)&&canonical(before[key])!==canonical(r.data[key]))return reject('Frozen prediction changed; create a new ID: '+key,409);
  }
  if(r.kind==='prediction'&&r.data.resolvedAt!=null&&(!realMoment(r.data.resolvedAt)||!r.data.resolvedAt.includes('T')||Date.parse(r.data.resolvedAt)<=Date.parse(r.data.targetPeriod.to+'T23:59:59.999Z')||Date.parse(r.data.resolvedAt)>Date.now()+300000))return reject('Resolution needs a valid timestamp after the target period and not in the future',409);
  if(r.kind==='prediction'&&(!['Unresolved','pending'].includes(r.data.status)||r.data.outcome!==null&&r.data.outcome!==undefined||r.data.brierScore!==null&&r.data.brierScore!==undefined||r.data.mae!=null||r.data.intervalCovered!=null)){
   if(Date.now()<=Date.parse(r.data.targetPeriod.to+'T23:59:59Z'))return reject('Cannot resolve or score before the target period ends',409);
   if(!r.data.resolutionEvidence?.length)return reject('Resolution requires observed outcome evidence',409);
   if(['ambiguous','void'].includes(r.data.status)&&(r.data.outcome!=null||r.data.brierScore!=null||r.data.mae!=null||r.data.intervalCovered!=null))return reject('Ambiguous or void outcomes cannot be scored',409);
   if(r.data.status==='resolved'){
    if(r.data.resolutionDecision?.criterionMet!==true||r.data.resolutionDecision?.criterion!==r.data.resolutionCriteria||!r.data.resolvedAt)return reject('Resolution must match the original criterion with a dated decision',409);
    if(r.data.decisionSourceId&&!r.data.resolutionEvidence.some(e=>(typeof e==='string'?e:e.sourceId)===r.data.decisionSourceId))return reject('Resolution must use the pre-declared decision source',409);
    if((r.data.forecastType??'binary')==='binary'){
     if(![0,1].includes(r.data.outcome))return reject('Binary outcome must be 0 or 1',409);
     if(Number.isFinite(r.data.probability))r.data.brierScore=(r.data.probability-r.data.outcome)**2;
    }else if(r.data.forecastType==='continuous'){
     if(!Number.isFinite(r.data.outcome)||!Number.isFinite(r.data.forecastValue)||!r.data.unit)return reject('Continuous resolution requires numeric values and units',409);
     r.data.mae=Math.abs(r.data.forecastValue-r.data.outcome);r.data.intervalCovered=r.data.interval?r.data.outcome>=r.data.interval.low&&r.data.outcome<=r.data.interval.high:null;
    }
   }
  }
  for(const sourceId of new Set([...(r.data.sourceIds??[]),...(r.data.edges??[]).flatMap(e=>e.sourceIds??[]),...(r.data.resolutionEvidence??[]).map(e=>typeof e==='string'?e:e.sourceId)])){
   if(!seen.has('source:'+sourceId)&&!await env.DB.prepare("SELECT id FROM records WHERE kind='source' AND id=? LIMIT 1").bind(sourceId).first())return reject('Unknown source '+sourceId);
  }
  for(const id of r.data.nodeIds??[])if(!seen.has('node:'+id)&&!await env.DB.prepare("SELECT id FROM records WHERE kind='node' AND id=? LIMIT 1").bind(id).first())return reject('Unknown node '+id);
  statements.push(env.DB.prepare('INSERT INTO records(kind,id,version,payload,recorded_at,run_id) VALUES(?,?,?,?,?,?)').bind(r.kind,r.id,r.expectedVersion+1,JSON.stringify(r.data),now,run.id));
 }
 statements.push(env.DB.prepare('INSERT INTO runs(id,status,started_at,recorded_at,duration_ms,usage_json,summary,payload_hash,record_count) VALUES(?,?,?,?,?,?,?,?,?)').bind(run.id,run.status,run.startedAt,now,Number.isFinite(run.durationMs)?run.durationMs:null,run.usage?JSON.stringify(run.usage):null,String(run.summary??'').slice(0,2000),hash,records.length));
 try{await env.DB.batch(statements);}catch{return reject('Atomic import failed or a concurrent writer won; read latest and retry with bounded policy',409);}
 return json({ok:true,runId:run.id,status:run.status,recordedAt:now,written:records.map(r=>({kind:r.kind,id:r.id,version:r.expectedVersion+1}))},201);
}
