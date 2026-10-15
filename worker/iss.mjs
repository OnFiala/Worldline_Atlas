export const ISS_SOURCE = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
export const ISS_FETCH_INTERVAL = 2 * 60 * 60 * 1000;
export const ISS_MAX_AGE = 24 * 60 * 60 * 1000;
export function issEpoch(raw) {
 if(typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z?$/.test(raw)) throw Error('Invalid epoch');
 const ms=Date.parse(raw.replace(/Z$/,'')+'Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==raw.slice(0,19))throw Error('Invalid epoch');
 return ms;
}
export function issValidate(input,now) {
 if(!Array.isArray(input)||input.length!==1)throw Error('Expected one ISS record');
 const p=input[0];if(!p||Number(p.NORAD_CAT_ID)!==25544||p.OBJECT_ID!=='1998-067A')throw Error('Wrong satellite');
 const epoch=issEpoch(p.EPOCH);if(epoch>now+15*60*1000)throw Error('Future epoch');
 const ranges={MEAN_MOTION:[12,18],ECCENTRICITY:[0,.02],INCLINATION:[40,60],RA_OF_ASC_NODE:[0,360],ARG_OF_PERICENTER:[0,360],MEAN_ANOMALY:[0,360],BSTAR:[-1,1],MEAN_MOTION_DOT:[-1,1],MEAN_MOTION_DDOT:[-1,1]};
 const out={OBJECT_NAME:'ISS (ZARYA)',OBJECT_ID:'1998-067A',NORAD_CAT_ID:25544,EPOCH:p.EPOCH.replace(/Z$/,'')};
 for(const [key,[min,max]] of Object.entries(ranges)){const v=p[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid orbital element');out[key]=v;}
 out.EPHEMERIS_TYPE=0;out.CLASSIFICATION_TYPE='U';out.ELEMENT_SET_NO=Number.isInteger(p.ELEMENT_SET_NO)?p.ELEMENT_SET_NO:0;out.REV_AT_EPOCH=Number.isInteger(p.REV_AT_EPOCH)?p.REV_AT_EPOCH:0;
 return out;
}
function issEnvelope(row,now) {
 let elements=null,epoch=null;try{if(row?.payload){elements=issValidate([JSON.parse(row.payload)],now);epoch=issEpoch(elements.EPOCH);}}catch{}
 const fresh=elements!==null&&now-epoch<=ISS_MAX_AGE;
 return {satellite:'ISS',catalogId:25544,source:{name:'CelesTrak GP / OMM',url:ISS_SOURCE},model:'SGP4',status:fresh?'available':elements?'stale':row?.stopped?'unavailable':'pending',serverTime:new Date(now).toISOString(),epoch:epoch===null?null:new Date(epoch).toISOString(),fetchedAt:row?.fetched_at??null,expiresAt:epoch===null?null:new Date(epoch+ISS_MAX_AGE).toISOString(),nextFetchAt:row?.stopped?null:row?.next_fetch_at?new Date(row.next_fetch_at).toISOString():null,fetchStopped:!!row?.stopped,error:row?.error??null,elements:fresh?elements:null,notice:'Calculated orbital estimate, not live telemetry. Position hidden once element epoch is more than 24 hours old.'};
}
export async function iss(request,env,options={}) {
 const url=new URL(request.url);if(url.pathname!=='/api/iss')return null;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const reply=(x,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(x),{status,headers});
 if(!['GET','HEAD'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return reply({error:'Origin not allowed'},403);
 if(url.search)return reply({error:'This endpoint accepts no parameters'},400);
 const now=options.now??Date.now(),db=env.DB;
 try{
  let row=await db.prepare("SELECT * FROM iss_cache WHERE id='25544'").first();
  if(request.method==='GET'&&!row?.stopped&&(!row||row.next_fetch_at<=now)){
   // D1 arbitrates across requests/isolates. Claim before fetching; crash still waits two hours.
   const claim=await db.prepare("INSERT INTO iss_cache(id,next_fetch_at) VALUES('25544',?) ON CONFLICT(id) DO UPDATE SET next_fetch_at=excluded.next_fetch_at WHERE iss_cache.stopped=0 AND iss_cache.next_fetch_at<=? RETURNING id").bind(now+ISS_FETCH_INTERVAL,now).first();
   if(claim){
    let timer;try{
     const controller=new AbortController();timer=setTimeout(()=>controller.abort(),12000);
     const upstream=await (options.fetcher??fetch)(ISS_SOURCE,{headers:{Accept:'application/json'},redirect:'manual',signal:controller.signal});
     if(upstream.status!==200)throw Error('Provider HTTP '+upstream.status);
     if(Number(upstream.headers.get('content-length')??0)>20000)throw Error('Provider response too large');
     const text=await upstream.text();if(text.length>20000)throw Error('Provider response too large');
     let input;try{input=JSON.parse(text);}catch{throw Error('Provider response is not JSON');}
     const elements=issValidate(input,now);
     await db.prepare("UPDATE iss_cache SET payload=?,fetched_at=?,error=NULL WHERE id='25544'").bind(JSON.stringify(elements),new Date(now).toISOString()).run();
    }catch(error){
     // Provider policy: stop on errors; retain prior data and surface the problem for review.
     const message=/^Provider HTTP \d{3}$/.test(error.message)?error.message:'Orbital fetch or validation failed';
     await db.prepare("UPDATE iss_cache SET stopped=1,error=? WHERE id='25544'").bind(message+'. Automatic source fetch paused for review.').run();
    }finally{clearTimeout(timer);}
   }
   row=await db.prepare("SELECT * FROM iss_cache WHERE id='25544'").first();
  }
  return reply(issEnvelope(row,now));
 }catch{return reply({status:'unavailable',error:'Orbital cache unavailable. Research data is unchanged.',serverTime:new Date(now).toISOString(),elements:null},503);}
}
