const ROOT='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/';
export async function imagery(request,ctx){
 const u=new URL(request.url);if(!u.pathname.startsWith('/imagery/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const m=u.pathname.match(/^\/imagery\/blue-marble\/([2-7])\/(\d{1,2})\/(\d{1,3})\.jpg$/);if(!m)return new Response('Unknown imagery tile',{status:404});
 const [z,row,col]=m.slice(1).map(Number),span=288/2**z;if(row>=Math.ceil(180/span)||col>=Math.ceil(360/span))return new Response('Tile outside matrix',{status:404});
 const key=new Request(u.origin+u.pathname);let cache=null;try{cache=typeof caches!=='undefined'?caches.default:null;const hit=await cache?.match(key);if(hit){const headers=new Headers(hit.headers);headers.set('Cache-Control','private, max-age=86400');return new Response(request.method==='HEAD'?null:hit.body,{status:200,headers});}}catch{cache=null;console.warn('Imagery: optional cache read unavailable; fetching public layer');}
 let timeout;
 try{
  const controller=new AbortController();timeout=setTimeout(()=>controller.abort(),12000);
  const upstream=await fetch(ROOT+`${z}/${row}/${col}.jpeg`,{headers:{Accept:'image/jpeg'},redirect:'manual',signal:controller.signal});
  if(!upstream.ok||!upstream.headers.get('content-type')?.includes('image/jpeg')){console.warn('Imagery: public layer response rejected',upstream.status);return new Response('Imagery temporarily unavailable',{status:502});}
  const bytes=await upstream.arrayBuffer();if(bytes.byteLength>1500000)return new Response('Unexpected tile size',{status:502});
  const response=new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','X-Imagery-Source':'NASA GIBS BlueMarble_ShadedRelief_Bathymetry; historical composite'}});
  if(cache&&ctx?.waitUntil){const cached=new Response(bytes,{headers:{...Object.fromEntries(response.headers),'Cache-Control':'public, max-age=86400'}});try{ctx.waitUntil(cache.put(key,cached).catch(()=>console.warn('Imagery: optional cache write unavailable')));}catch{console.warn('Imagery: optional cache write unavailable');}}
  return request.method==='HEAD'?new Response(null,{status:200,headers:response.headers}):response;
 }catch(error){console.warn('Imagery: public layer request failed',String(error?.name??'Error').slice(0,80),String(error?.message??'').slice(0,240));return new Response('Imagery temporarily unavailable; base layer retained',{status:502});}
 finally{if(timeout!==undefined)clearTimeout(timeout);}
}
