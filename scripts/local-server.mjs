import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {database} from './local-db.mjs';
import {demoRecords} from './demo-data.mjs';
import {api} from '../worker/api.mjs';

const root=resolve(import.meta.dirname,'..');
const frontend=resolve(root,'frontend');
const routes=new Set(['/','/connections','/forecasts','/performance','/methodology']);
const securityHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...securityHeaders,'Content-Type':'application/json; charset=utf-8'}});

export async function createDemoHandler() {
 const DB=database();
 for(const file of ['0000_atlas.sql','0001_iss_cache.sql'])DB.db.exec(await readFile(resolve(root,'drizzle',file),'utf8'));
 const body={run:{id:'synthetic-demo',startedAt:new Date().toISOString(),status:'succeeded',writerRole:'integrator',summary:'Original fictional examples only; not a research update.'},records:demoRecords()};
 const initialized=await api(new Request('http://127.0.0.1/api/ingest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{DB,WRITE_AUTHORIZED:true});
 if(initialized.status!==201)throw Error('Synthetic demo initialization failed');
 const handler=async request=>{
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return json({error:'Public demo is read-only'},403);
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return json({error:'Foreign origin is not allowed'},403);
  if(url.pathname==='/api/iss')return json({status:'disabled',fetchStopped:true,elements:null,serverTime:new Date().toISOString(),error:'Public reference demo: live orbital data is disconnected. No provider request was made.'});
  if(url.pathname.startsWith('/imagery/'))return json({error:'External imagery is disconnected in this demo'},404);
  if(url.pathname.startsWith('/api/'))return await api(new Request(url,{method:'GET'}),{DB,LOCAL_PREVIEW:true,WRITE_AUTHORIZED:false})??json({error:'Not found'},404);
  try{
   const pathname=routes.has(url.pathname)?'/index.html':decodeURIComponent(url.pathname);
   const docs={'/operations.md':'OPERATIONS.md','/data-contracts.md':'DATA_CONTRACTS.md'};
   const file=docs[pathname]?resolve(root,'docs',docs[pathname]):resolve(frontend,'.'+pathname);
   if(!docs[pathname]&&!file.startsWith(frontend+'/'))return json({error:'Not found'},404);
   const bytes=await readFile(file);
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8'}[extname(file)]??'application/octet-stream';
   return new Response(bytes,{headers:{...securityHeaders,'Content-Type':type}});
  }catch{return json({error:'Not found'},404);}
 };
 return {handler,close:()=>DB.db.close()};
}

export async function startDemo(port=8797) {
 const demo=await createDemoHandler();
 const server=createServer(async(req,res)=>{
  try{
   const actualPort=server.address().port;
   if(!['127.0.0.1:'+actualPort,'localhost:'+actualPort].includes(req.headers.host)){res.writeHead(403);res.end('Loopback host required');return;}
   const url=new URL(req.url,'http://'+req.headers.host);
   const response=await demo.handler(new Request(url,{method:req.method,headers:req.headers}));
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,securityHeaders);res.end('Local demo error');}
 });
 server.on('close',demo.close);
 await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
 return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.length>1||args.length===1&&!/^--port=\d+$/.test(args[0]))throw Error('Usage: node scripts/local-server.mjs [--port=8797]');
 const port=args.length?Number(args[0].slice(7)):8797;
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
 const server=await startDemo(port);
 console.log(`Synthetic read-only demo: http://127.0.0.1:${server.address().port} · no external feeds or personal automations`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
