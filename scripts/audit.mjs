#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const VERSION='1.0.0';
export const hash=v=>createHash('sha256').update(v).digest('hex');
export function canonical(v){return JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);}
const need=(v,name)=>{if(v===undefined||v===true||!String(v).trim())throw Error(`Required: ${name}`);return String(v).trim();};
const integer=(v,name,min=0)=>{if(!/^\d+$/.test(String(v)))throw Error(`${name} must be an integer`);const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>10000000)throw Error(`${name} out of range`);return n;};
export function decimal(v){const s=String(v??'').trim();if(!/^-?\d{1,15}(\.\d{1,2})?$/.test(s))throw Error(`Invalid amount: ${s}. Use signed decimal units without separators.`);const [whole,frac='']=s.replace('-','').split('.');const cents=BigInt(whole)*100n+BigInt(frac.padEnd(2,'0'));return ((s.startsWith('-')?-1n:1n)*cents);}
export const units=n=>`${n<0n?'-':''}${(n<0n?-n:n)/100n}.${((n<0n?-n:n)%100n).toString().padStart(2,'0')}`;
function date(v,name='date'){const s=need(v,name);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(`Invalid ${name}: use YYYY-MM-DD`);return s;}
export function args(argv){const pos=[],opts={};for(const a of argv){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in opts)throw Error(`Duplicate option --${k}`);opts[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {pos,opts};}
export async function resolve(db,kind,key){
 const col=kind==='test_runs'?'test_name':'name';
 if(!['engagements','populations','test_runs'].includes(kind))throw Error('Unsupported record type');
 key=need(key,kind);
 let rows=await db.query(`select * from ${kind} where id::text=$1 or lower(${col})=lower($1) order by id`,[key]);
 if(rows.length!==1)rows=await db.query(`select * from ${kind} where left(id::text,length($1))=$1 or position(lower($1) in lower(${col}))>0 order by id`,[key]);
 if(rows.length!==1)throw Error(`${kind}: ${rows.length?'ambiguous':'no match'} "${key}"${rows.length?'\n'+rows.map(r=>`${r.id}  ${r[col]}`).join('\n'):''}`);
 return rows[0];
}
export const TESTS=['duplicates','gaps','journals','weekend','round-amounts','high-value','missing-fields','period-check','sample'];
const ALL=['help','engagements','populations','profile',...TESTS,'vendor-summary','account-summary','controls','run-suite','runs','run','review','reviews','compliance','attention','weekly-review','draft-evidence','add','log','history','import','export'];
const COLUMNS={record_id:['record_id','RECORD_ID','REFERENCE','REF','TRANSACTION_ID'],journal:['journal','JOURNAL_NO','JOURNAL'],invoice:['invoice','INVOICE_NO','INVOICE'],vendor:['vendor','VENDOR_NAME','SUPPLIER'],account:['account','ACCOUNT_CODE'],entry_date:['entry_date','DATE','TRANSACTION_DATE'],amount:['amount','AMOUNT','NET_AMOUNT'],entered_by:['entered_by','USER','PREPARER'],description:['description','DESCRIPTION','NARRATIVE']};
export async function importIdea(db,o){
 const actor=need(o.actor,'--actor'),file=path.resolve(need(o.file,'--file'));
 const g=await resolve(db,'engagements',o.engagement),name=need(o.name,'--name');
 const buf=fs.readFileSync(file),sha=hash(buf),rows=parseCsv(buf.toString('utf8'));
 if(!rows.length)throw Error('Import has no data rows');
 const mapping=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Mapping must be an object');
 for(const [k,v] of Object.entries(mapping)){if(!(k in COLUMNS)||typeof v!=='string')throw Error(`Unknown mapping: ${k}`);if(!Object.keys(rows[0]).includes(v))throw Error(`Mapped column missing: ${v}`);}
 for(const k of ['record_id','entry_date','amount'])if(!mapping[k]&&!COLUMNS[k].some(h=>Object.keys(rows[0]).some(x=>x.toLowerCase()===h.toLowerCase())))throw Error(`Missing column ${k}; provide --map`);
 const data=rows.map((raw,i)=>{const r={};for(const [k,aliases] of Object.entries(COLUMNS))r[k]=String(mapping[k]?raw[mapping[k]]:pick(raw,...aliases)).trim();need(r.record_id,`row ${i+2} record_id`);r.entry_date=date(r.entry_date,`row ${i+2} date`);r.amount=units(decimal(r.amount));return {...r,raw,row_no:i+1};});
 const net=units(data.reduce((sum,r)=>sum+decimal(r.amount),0n));
 const expectedCount=o['expected-count']===undefined?null:integer(o['expected-count'],'expected-count');
 const expectedNet=o['expected-net']===undefined?null:units(decimal(o['expected-net']));
 if(expectedCount!==null&&expectedCount!==data.length)throw Error(`Count mismatch: expected ${expectedCount}, found ${data.length}`);
 if(expectedNet!==null&&expectedNet!==net)throw Error(`Net mismatch: expected ${expectedNet}, found ${net}`);
 const previous=(await db.query('select * from populations where engagement_id=$1 and name=$2',[g.id,name]))[0];
 if(previous){if(previous.source_sha256===sha&&canonical(previous.mapping)===canonical(mapping)&&previous.expected_count===expectedCount&&(previous.expected_net===null?null:units(decimal(previous.expected_net)))===expectedNet)return {id:previous.id,status:'unchanged',rows:data.length,net};throw Error('Population name already exists with different source, mapping or controls. Use a new snapshot name.');}
 if(o['dry-run'])return {status:'dry-run',rows:data.length,net,currency:g.currency,source_sha256:sha};
 await db.exec('BEGIN');try{
 const p=(await db.query('insert into populations(engagement_id,name,source_file,source_sha256,mapping,expected_count,expected_net,imported_by,row_count) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',[g.id,name,path.basename(file),sha,JSON.stringify(mapping),expectedCount,expectedNet,actor,data.length]))[0];
 for(const r of data)await db.query('insert into entries(population_id,row_no,record_id,journal,invoice,vendor,account,entry_date,amount,entered_by,description,raw) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[p.id,r.row_no,r.record_id,r.journal,r.invoice,r.vendor,r.account,r.entry_date,r.amount,r.entered_by,r.description,JSON.stringify(r.raw)]);
 await db.exec('COMMIT');return {id:p.id,status:'imported',rows:data.length,net,currency:g.currency};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export async function analyse(db,test,p,o={}){
 const select='row_no,record_id,journal,invoice,vendor,account,entry_date,amount::text amount,entered_by,description';
 const query=(sql,extra=[])=>db.query(sql,[p.id,...extra]);
 if(test==='profile')return query('select count(*)::integer rows,min(entry_date) first_date,max(entry_date) last_date,min(amount)::text minimum,max(amount)::text maximum,sum(amount)::text net,sum(case when amount>0 then amount else 0 end)::text debits,sum(case when amount<0 then -amount else 0 end)::text credits,count(distinct vendor)::integer vendors from entries where population_id=$1');
 if(test==='duplicates')return query("select lower(trim(vendor)) vendor,lower(trim(invoice)) invoice,amount::text amount,count(*)::integer occurrences,string_agg(record_id,', ' order by row_no) records from entries where population_id=$1 and trim(vendor)<>'' and trim(invoice)<>'' group by lower(trim(vendor)),lower(trim(invoice)),amount having count(*)>1 order by vendor,invoice,amount");
 if(test==='gaps')return query("with nums as(select distinct record_id::numeric n from entries where population_id=$1 and record_id ~ '^[0-9]{1,15}$'),seq as(select n,lead(n) over(order by n) next from nums) select (n+1)::text missing_from,(next-1)::text missing_to,(next-n-1)::text missing_count from seq where next>n+1 order by n");
 if(test==='journals')return query("select journal,count(*)::integer lines,sum(amount)::text imbalance,string_agg(record_id,', ' order by row_no) records from entries where population_id=$1 and trim(journal)<>'' group by journal having sum(amount)<>0 order by journal");
 if(test==='weekend')return query(`select ${select} from entries where population_id=$1 and extract(isodow from entry_date) in(6,7) order by row_no`);
 if(test==='high-value'||test==='round-amounts'){
 const threshold=units(decimal(o.threshold??'10000'));if(decimal(threshold)<=0n)throw Error('Threshold must be positive');
 return query(`select ${select} from entries where population_id=$1 and abs(amount)>=$2::numeric ${test==='round-amounts'?'and mod(abs(amount),$2::numeric)=0':''} order by abs(amount) desc,row_no`,[threshold]);
 }
 if(test==='missing-fields')return query(`select ${select} from entries where population_id=$1 and (trim(vendor)='' or trim(invoice)='' or trim(account)='' or trim(entered_by)='') order by row_no`);
 if(test==='period-check')return query(`select ${select.split(',').map(s=>s==='amount::text amount'?'e.amount::text amount':'e.'+s).join(',')} from entries e join populations p on p.id=e.population_id join engagements g on g.id=p.engagement_id where e.population_id=$1 and (e.entry_date<g.period_start or e.entry_date>g.period_end) order by e.row_no`);
 if(test==='vendor-summary'||test==='account-summary'){const field=test==='vendor-summary'?'vendor':'account';return query(`select ${field},count(*)::integer lines,sum(amount)::text net,sum(abs(amount))::text gross from entries where population_id=$1 group by ${field} order by sum(abs(amount)) desc,${field}`);}
 if(test==='sample'){
 const size=integer(o.size??'3','sample size',1),seed=need(o.seed,'--seed');
 const rows=await query(`select ${select} from entries where population_id=$1 order by row_no`);
 if(size>rows.length)throw Error('Sample size exceeds population');
 return rows.map(r=>({r,key:hash(`${seed}:${p.source_sha256}:${r.row_no}`)})).sort((a,b)=>a.key.localeCompare(b.key)).slice(0,size).map(x=>x.r);
 }
 throw Error(`Unknown analysis ${test}`);
}
async function saveRun(db,p,test,results,o){
 const prepared=need(o.actor,'--actor'),purpose=need(o.purpose,'--purpose');
 const due=date(o.due??new Date().toISOString().slice(0,10),'--due');
 const parameters={threshold:o.threshold??'10000',...(o.size?{size:String(o.size)}:{}),...(o.seed?{seed:String(o.seed)}:{})};
 return (await db.query('insert into test_runs(population_id,test_name,parameters,results,prepared_by,purpose,source_sha256,result_sha256,engine_version,due_date) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,test_name,due_date',[p.id,test,JSON.stringify(parameters),JSON.stringify(results),prepared,purpose,p.source_sha256,hash(canonical(results)),VERSION,due]))[0];
}
export async function compliance(db){
 const controls=await db.query('select name,engagement from population_controls where not reconciled order by engagement,name');
 const overdue=await db.query('select id,engagement,test_name from review_queue where due_date<current_date order by due_date,id');
 return [...controls.map(r=>({rule:'CONTROL-TOTALS',record:r.name,engagement:r.engagement,issue:'Independent count and net controls missing or different',source:'docs/compliance.md#control-totals'})),...overdue.map(r=>({rule:'REVIEW-DUE',record:r.test_name,engagement:r.engagement,issue:'Documented review overdue under firm policy',source:'docs/compliance.md#review-due'}))];
}
function display(data){const rows=Array.isArray(data)?data:[data];if(!rows.length)return '  (none)';return table(rows,Object.keys(rows[0]).map(key=>({key,label:key,format:v=>typeof v==='object'?JSON.stringify(v):v})));}
function draft(name,body){const dir=path.join(REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,`${name}-${Date.now()}-${Math.random().toString(16).slice(2,8)}.md`);fs.writeFileSync(f,body,{mode:0o600,flag:'wx'});return {file:path.relative(REPO_ROOT,f)};}
export async function execute(db,argv){
 const {pos,opts:o}=args(argv),[cmd='help',arg]=pos;
 if(!ALL.includes(cmd))throw Error(`Unknown command ${cmd}. Use help.`);
 const allowed=new Set(['json','population','engagement','actor','file','name','map','expected-count','expected-net','dry-run','threshold','size','seed','save','purpose','due','conclusion','evidence','currency','from','to','owner','text']);
 for(const k of Object.keys(o))if(!allowed.has(k))throw Error(`Unknown option --${k}`);
 if(cmd==='help')return ALL.map(command=>({command,usage:TESTS.includes(command)?'--population=<name/id> [--save --actor=<name> --purpose=<text> --due=YYYY-MM-DD]':command==='import'?'idea --engagement=<name/id> --file=<CSV> --name=<snapshot> --actor=<name> [--map=<JSON>] [--dry-run]':'See README.md and .claude/commands'}));
 if(cmd==='engagements')return db.query('select * from engagement_week order by name');
 if(cmd==='populations'||cmd==='controls')return db.query('select * from population_controls order by engagement,name');
 if(cmd==='attention')return db.query('select engagement,population,test_name,prepared_by,due_date,days_overdue from review_queue order by due_date,id');
 if(cmd==='compliance')return compliance(db);
 if(cmd==='runs')return db.query('select id,test_name,prepared_by,purpose,due_date,created_at from test_runs order by created_at,id');
 if(cmd==='reviews')return db.query('select * from reviews order by created_at,id');
 if(cmd==='run'){const r=await resolve(db,'test_runs',arg);return {...r,reviews:await db.query('select * from reviews where run_id=$1 order by created_at,id',[r.id])};}
 if(cmd==='review'){
 const r=await resolve(db,'test_runs',arg),actor=need(o.actor,'--actor');
 return db.query('insert into reviews(run_id,reviewer,conclusion,evidence) values($1,$2,$3,$4) returning id,run_id,reviewer,created_at',[r.id,actor,need(o.conclusion,'--conclusion'),need(o.evidence,'--evidence')]);
 }
 if(cmd==='add'){
 if(arg!=='engagement')throw Error('Use add engagement');
 const start=date(o.from,'--from'),end=date(o.to,'--to');if(end<start)throw Error('Period end precedes start');
 return db.query('insert into engagements(name,currency,period_start,period_end,owner,due_date) values($1,$2,$3,$4,$5,$6) returning id,name,currency',[need(o.name,'--name'),need(o.currency,'--currency').toUpperCase(),start,end,need(o.owner??o.actor,'--owner or --actor'),date(o.due,'--due')]);
 }
 if(cmd==='log'){const g=await resolve(db,'engagements',o.engagement);return db.query('insert into notes(engagement_id,actor,body) values($1,$2,$3) returning id,actor,body',[g.id,need(o.actor,'--actor'),need(o.text,'--text')]);}
 if(cmd==='history'){const g=await resolve(db,'engagements',o.engagement);return db.query('select actor,body,created_at from notes where engagement_id=$1 order by created_at,id',[g.id]);}
 if(cmd==='import'){if(arg!=='idea')throw Error('Use import idea');return importIdea(db,o);}
 if(cmd==='export'){
 const dest=path.resolve(need(o.file,'--file')),backup={version:VERSION,exported_at:new Date().toISOString(),data:{}};
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of ['engagements','populations','entries','test_runs','reviews','notes'])backup.data[t]=await db.query(`select * from ${t} order by id`);}finally{await db.exec('ROLLBACK');}
 fs.writeFileSync(dest,JSON.stringify(backup,null,2)+'\n',{mode:0o600,flag:'wx'});return {file:dest,records:Object.values(backup.data).reduce((n,r)=>n+r.length,0)};
 }
 if(cmd==='weekly-review'){
 const sections=[];for(const c of ['engagements','attention','compliance'])sections.push(`## ${c}\n\n${display(await execute(db,[c]))}`);
 return draft('weekly-review',`# Weekly audit analysis review\n\nPrepared ${new Date().toISOString()}. Internal draft, no audit conclusion.\n\n${sections.join('\n\n')}\n`);
 }
 if(cmd==='draft-evidence'){const r=await execute(db,['run',need(arg,'run id')]);return draft('evidence',`# Evidence review draft\n\nRun ${r.id}. Test ${r.test_name}.\n\nPurpose: ${r.purpose}\n\nPreparer: ${r.prepared_by}\nSource SHA-256: ${r.source_sha256}\nResults SHA-256: ${r.result_sha256}\nEngine: ${r.engine_version}\nParameters: ${JSON.stringify(r.parameters)}\n\n${display(r.results)}\n\nReviews:\n${display(r.reviews)}\n\nExceptions are leads for investigation, not findings of fraud or an audit opinion.\n`);}
 const p=await resolve(db,'populations',o.population);
 if(cmd==='run-suite'){
 need(o.actor,'--actor');need(o.purpose,'--purpose');const out=[];
 await db.exec('BEGIN');try{for(const test of TESTS.filter(t=>t!=='sample')){const results=await analyse(db,test,p,o);out.push({...await saveRun(db,p,test,results,o),results:results.length});}await db.exec('COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}
 }
 const results=await analyse(db,cmd,p,o);
 if(o.save){if(!TESTS.includes(cmd))throw Error('Only analytical tests can be saved');return {...await saveRun(db,p,cmd,results,o),results};}
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const out=await execute(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(out,null,2):display(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
