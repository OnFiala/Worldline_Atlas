import {DatabaseSync} from 'node:sqlite';
export function database(path=':memory:'){
 const db=new DatabaseSync(path);
 const wrap=(sql,args=[])=>({bind(...x){return wrap(sql,x);},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:r};},_sql:sql,_args:args});
 return {db,prepare:wrap,async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>({success:true,meta:db.prepare(s._sql).run(...s._args)}));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
