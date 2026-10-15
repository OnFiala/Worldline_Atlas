import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createConnection,createServer} from 'node:net';
import {once} from 'node:events';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
async function availablePort(){
 const reservation=createServer();
 await new Promise((done,fail)=>{reservation.once('error',fail);reservation.listen(0,'127.0.0.1',done);});
 const port=reservation.address().port;
 await new Promise(done=>reservation.close(done));
 return port;
}
function within(promise,ms,label){
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]).finally(()=>clearTimeout(timer));
}
async function check(signal,stalled){
 const port=await availablePort(),sockets=[];
 const child=spawn(process.execPath,['--experimental-sqlite','scripts/local-server.mjs','--port='+port],{cwd:root,stdio:['ignore','pipe','pipe']});
 const exited=once(child,'exit');
 let errors='';child.stderr.on('data',chunk=>{errors+=chunk;});
 try{
  await within(new Promise((done,fail)=>{
   let output='';child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('Synthetic read-only demo:'))done();});
   child.once('error',fail);child.once('exit',()=>fail(Error('Server exited before ready: '+errors)));
  }),5000,'Server startup timed out');
  const response=await fetch('http://127.0.0.1:'+port+'/api/snapshot');
  assert.equal(response.status,200);assert.equal((await response.json()).events.length,1);
  if(stalled){
   for(const headers of ['', 'GET / HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\n']){
    const socket=createConnection({host:'127.0.0.1',port});sockets.push(socket);
    socket.on('error',()=>{});await once(socket,'connect');if(headers)socket.write(headers);
   }
  }
  assert.ok(child.kill(signal));
  const [code,exitSignal]=await within(exited,4000,signal+' did not finish with '+(stalled?'unfinished TCP connections':'ordinary HTTP traffic'));
  assert.equal(code,0,errors);assert.equal(exitSignal,null);
  const rebound=createServer();
  await new Promise((done,fail)=>{rebound.once('error',fail);rebound.listen(port,'127.0.0.1',done);});
  await new Promise(done=>rebound.close(done));
 }finally{
  for(const socket of sockets)socket.destroy();
  if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
  await exited;
 }
}
for(const signal of ['SIGINT','SIGTERM'])for(const stalled of [false,true])await check(signal,stalled);
console.log('PASS: CLI SIGINT and SIGTERM exit normally after HTTP traffic and stalled/preconnected TCP sockets; listening port is released. Loopback only.');
