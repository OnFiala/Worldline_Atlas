import {json2satrec,propagate,gstime,eciToGeodetic,degreesLat,degreesLong} from './vendor/satellite-6.0.1.js';

export function createOrbit(elements){return json2satrec(elements);}
export function orbitPoint(satrec,time){
 const result=propagate(satrec,new Date(time));if(!result?.position||satrec.error)return null;
 const p=eciToGeodetic(result.position,gstime(new Date(time)));
 if(![p.latitude,p.longitude,p.height].every(Number.isFinite)||p.height<150||p.height>700)return null;
 return {lat:degreesLat(p.latitude),lon:degreesLong(p.longitude),height:p.height,time};
}
export function orbitFresh(epoch,time){const e=Date.parse(epoch);return Number.isFinite(e)&&time-e<=86400000&&e-time<=900000;}
export function projectOrbit(globe,point){
 const r=1+point.height/6371,p=globe.pos(point.lat,point.lon,r),v=[p[0],p[1],p[2]-globe.distance],dot=v.reduce((s,x)=>s+x*x,0),k=Math.max(0,Math.min(1,-globe.distance*v[2]/dot));
 const nearest=v[0]**2*k*k+v[1]**2*k*k+(globe.distance+v[2]*k)**2;
 return {...globe.project(point.lat,point.lon,r),visible:nearest>=1};
}
const utc=value=>new Date(value).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
export class IssLayer {
 constructor(globe){
  this.globe=globe;this.panel=document.querySelector('#iss-panel');this.status=document.querySelector('#iss-status');this.info=document.querySelector('#iss-info');this.focus=document.querySelector('#iss-focus');this.toggle=document.querySelector('#iss-toggle');this.marker=document.querySelector('#iss-marker');this.trail=document.querySelector('#iss-trail');this.enabled=true;this.ready=false;this.loading=false;this.track=[];this.lastPosition=0;this.lastTrack=0;
  this.marker.onclick=()=>{this.panel.open=true;this.focus.focus();};
  this.focus.onclick=()=>{if(this.point){globe.focus({id:globe.selected,...this.point});this.panel.open=true;}};
  this.toggle.onchange=()=>{this.enabled=this.toggle.checked;this.draw();};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.update(true);if(Date.now()-(this.lastFetch??0)>300000)this.load();}});
  this.panel.addEventListener('toggle',()=>this.update(true));
  globe.onOverlayDraw=()=>this.draw();this.load();
  this.timer=setInterval(()=>{if(!document.hidden&&!document.body.classList.contains('page-mode')){this.update();if(Date.now()-(this.lastFetch??0)>300000)this.load();}},1000);
 }
 async load(){
  if(this.loading)return;this.loading=true;this.lastFetch=Date.now();
  try{const response=await fetch('/api/iss',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();this.data=data;this.serverBase=Date.parse(data.serverTime);this.clientBase=performance.now();if(!Number.isFinite(this.serverBase))throw Error();this.orbit=data.elements?createOrbit(data.elements):null;this.networkError=false;this.lastTrack=0;this.update(true);}
  catch{this.networkError=true;this.update(true);}
  finally{this.loading=false;}
 }
 update(force=false){
  const now=this.serverBase===undefined?Date.now():this.serverBase+performance.now()-this.clientBase;
  const fresh=this.orbit&&orbitFresh(this.data?.epoch,now);this.ready=!!fresh;this.point=fresh?orbitPoint(this.orbit,now):null;
  if(!this.point)this.ready=false;
  const age=this.data?.epoch?Math.max(0,(now-Date.parse(this.data.epoch))/3600000):null;
  this.status.textContent=this.data?.status==='disabled'?'ISS · Not connected in public demo':this.ready?'ISS · Calculated position':this.data?.status==='stale'||(this.orbit&&!fresh)?'ISS · Stale data — hidden':this.orbit||this.networkError?'ISS · Unavailable':'ISS · '+(this.data?.fetchStopped?'Source paused':'Loading orbit…');
  this.panel.dataset.state=this.ready?'available':this.data?.status??'unavailable';this.focus.disabled=!this.ready;
  if(this.ready&&(force||now-this.lastTrack>15000)){
   this.track=[];for(let step=0;step<=120;step++){const p=orbitPoint(this.orbit,now-600000+step*5000);if(p)this.track.push(p);}this.lastTrack=now;
  }
  if(force||this.panel.open){
   this.info.replaceChildren();
   const line=(label,value)=>{const p=document.createElement('p'),b=document.createElement('b');b.textContent=label+': ';p.append(b,document.createTextNode(value));this.info.append(p);};
   line('Model','SGP4 estimate, not live telemetry');
   if(this.data?.epoch)line('Element epoch',utc(this.data.epoch)+' · '+age.toFixed(1)+' h old');
   if(this.data?.fetchedAt)line('Retrieved',utc(this.data.fetchedAt));
   if(this.ready){line('Calculated for',utc(now));line('Position',this.point.lat.toFixed(1)+'°, '+this.point.lon.toFixed(1)+'° · '+Math.round(this.point.height)+' km altitude');line('Trail','Previous 10 minutes of calculated positions');}
   if(this.networkError)line('Connection','Latest refresh failed; prior element epoch is retained');
   if(this.data?.error)line('Source status',this.data.error);
   line('Freshness','Hidden after 24 h from element epoch');
   const a=document.createElement('a');a.href='https://celestrak.org/NORAD/documentation/gp-data-formats.php';a.target='_blank';a.rel='noopener noreferrer';a.textContent='CelesTrak GP / ISS 25544 ↗';this.info.append(a);
  }
  if(force||!this.ready||!this.globe.reduced||now-this.lastPosition>=60000){this.lastPosition=now;this.draw();}
 }
 draw(){
  const g=this.globe,w=g.canvas.clientWidth,h=g.canvas.clientHeight,active=this.ready&&this.enabled&&!!this.point;
  this.marker.hidden=true;this.trail.replaceChildren();if(!active||!w||!h)return;
  const point=projectOrbit(g,this.point);this.marker.hidden=!point.visible||point.x<20||point.x>w-20||point.y<20||point.y>h-100;
  this.marker.style.left=point.x+'px';this.marker.style.top=point.y+'px';this.marker.dataset.positionTime=new Date(this.point.time).toISOString();
  this.marker.setAttribute('aria-label','ISS calculated orbital position. Open source, epoch and model details.');
  this.trail.setAttribute('viewBox',`0 0 ${w} ${h}`);
  for(let part=0;part<10;part++){
   let d='',pen=false,prev=null;
   for(const p of this.track.slice(part*12,part*12+13)){const v=projectOrbit(g,p);const inside=v.visible&&v.x>=0&&v.x<=w&&v.y>=0&&v.y<=h;if(inside){if(prev&&Math.hypot(v.x-prev.x,v.y-prev.y)>w/3)pen=false;d+=(pen?'L':'M')+v.x.toFixed(1)+','+v.y.toFixed(1);pen=true;prev=v;}else{pen=false;prev=null;}}
   if(d){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('stroke-opacity',String(.06+part*.022));this.trail.append(path);}
  }
 }
}
