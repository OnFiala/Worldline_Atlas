import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
for(const test of ['test-api.mjs','test-explain.mjs','test-imagery.mjs','test-imagery-visibility.mjs','test-iss.mjs','test-demo.mjs']){
 const result=spawnSync(process.execPath,['--experimental-sqlite',resolve(root,'scripts',test)],{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
console.log('PASS: all six test scripts completed. No external-provider requests.');
