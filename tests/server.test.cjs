'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), os=require('node:os'), path=require('node:path'), {spawn}=require('node:child_process');
const rules=require('../rules.js');
const empty=()=>({stage:'intro',records:{},completions:{},archives:[]});
test('classroom identity, authorization, isolation, deduplication and persistence',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'delivery-test-'));
 const rosterFile=path.join(dir,'roster.json');
 fs.writeFileSync(rosterFile,JSON.stringify([
  {id:'one',classId:'601',name:'测试甲'},{id:'two',classId:'602',name:'测试甲'},
  {id:'same-a',classId:'601',name:'同名测试'},{id:'same-b',classId:'601',name:'同名测试'}
 ]));
 let child,base,port=0;
 async function start(){
  const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,ROSTER_FILE:rosterFile};delete env.TEACHER_PASSWORD;
  child=spawn(process.execPath,['--no-warnings',path.join(__dirname,'../server.cjs')],{env,stdio:'pipe'});
  await new Promise((resolve,reject)=>{
   let output='',errors='';const timer=setTimeout(()=>reject(Error('Server startup timeout '+errors)),8000);
   child.stderr.on('data',v=>{errors+=v;});
   child.stdout.on('data',v=>{output+=v;const match=output.match(/http:\/\/localhost:(\d+)/);if(match){port=Number(match[1]);base='http://127.0.0.1:'+port;clearTimeout(timer);resolve();}});
   child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',c=>{clearTimeout(timer);reject(Error('Server exited '+c+' '+errors));});
  });
 }
 async function stop(){if(child&&child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
 t.after(async()=>{await stop();fs.rmSync(dir,{recursive:true,force:true});});await start();
 async function api(route,body,cookie=''){
  const res=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 }
 assert.deepEqual((await api('/api/classes')).data.classes,['601','602','603','604','605','606']);
 assert.equal((await api('/api/roster?class=601')).data.length,3);
 assert.equal((await api('/api/roster?class=501')).status,400);
 assert.equal((await api('/api/me')).status,401);
 assert.equal((await api('/api/teacher/class?class=601')).status,401);
 assert.equal((await fetch(base+'/test',{redirect:'manual'})).status,302);
 assert.equal((await api('/api/progress',{sid:'one',eventId:'unauthed',version:0,payload:empty()})).status,401);
 for(const route of ['/roster.json','/runtime/classroom.sqlite','/server.cjs','/package.json','/../roster.json','/%2e%2e/roster.json','/assets/../../roster.json'])assert.equal((await fetch(base+route)).status,404);
 assert.equal((await api('/api/login',{classId:'601',id:'two'})).status,400);
 assert.equal((await api('/api/login',{classId:'601',name:'同名测试'})).status,409);
 const duplicate=await api('/api/login',{classId:'601',id:'same-b'});assert.equal(duplicate.data.student.id,'same-b');
 assert.equal((await api('/api/login',{classId:'601',name:'   '})).status,400);
 const a=await api('/api/login',{classId:'601',id:'one'}),b=await api('/api/login',{classId:'602',id:'two'});
 assert.match(a.cookie,/^delivery_student=/);
 assert.equal((await api('/api/me',undefined,a.cookie)).data.student.id,'one');
 assert.equal((await api('/api/me',undefined,a.cookie.replace('delivery_student','hanoi_student'))).status,401);
 const event={sid:'one',eventId:'first-save',version:0,payload:empty()};
 assert.equal((await api('/api/progress',{...event,sid:'two'},a.cookie)).status,403);
 for(const payload of [null,{}, {...empty(),stage:'unknown'},{...empty(),records:{unknown:{}}},{...empty(),completions:{intro:{forged:true}}}])assert.equal((await api('/api/progress',{...event,payload},a.cookie)).status,400);
 assert.equal((await api('/api/progress',{...event,eventId:''},a.cookie)).status,400);
 assert.equal((await api('/api/progress',{...event,version:undefined},a.cookie)).status,400);
 let saved=await api('/api/progress',event,a.cookie);assert.equal(saved.status,200);assert.equal(saved.data.version,1);assert.equal(saved.data.points,0);
 saved=await api('/api/progress',event,a.cookie);assert.equal(saved.data.version,1);
 assert.equal((await api('/api/progress',{...event,eventId:'stale'},a.cookie)).status,409);
 assert.equal((await api('/api/me',undefined,b.cookie)).data.version,0);
 assert.equal((await api('/api/teacher/login',{password:'wrong'})).status,401);
 const teacher=await api('/api/teacher/login',{password:'teacher'});assert.match(teacher.cookie,/^delivery_teacher=/);
 assert.equal(fs.readFileSync(path.join(dir,'teacher-password.txt'),'utf8'),'teacher');
 assert.equal((await fetch(base+'/test',{headers:{Cookie:teacher.cookie},redirect:'manual'})).status,200);
 assert.equal((await api('/api/teacher/class?class=601',undefined,a.cookie)).status,401);
 let report=await api('/api/teacher/class?class=601',undefined,teacher.cookie);assert.equal(report.data.students.length,3);assert.ok(report.data.students.every(s=>s.class_id==='601'));
 const manual=await api('/api/login',{classId:'601',name:'名单外测试'});
 const again=await api('/api/login',{classId:'601',name:' 名单外测试 '});assert.equal(manual.data.student.id,again.data.student.id);
 assert.equal(manual.data.student.manual,1);
 await stop();await start();
 assert.equal((await api('/api/me',undefined,a.cookie)).data.version,1);
 assert.equal((await api('/api/me',undefined,b.cookie)).data.version,0);
 assert.equal((await api('/api/teacher/class?class=601',undefined,teacher.cookie)).status,200);
 assert.equal((await api('/api/login',{classId:'601',name:'名单外测试'})).data.student.id,manual.data.student.id);
 const csrf=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify({classId:'601',id:'one'})});assert.equal(csrf.status,403);
 const route=['go',...Array(4).fill('tick'),'stop','left','slow','go',...Array(4).fill('tick'),'stop','right','go',...Array(4).fill('tick'),'stop'];
 const turn=rules.manualMoments(route).find(m=>m.action==='left');
 const proofs={intro:{answers:[0,1],submitted:true},manual:{actions:route,keyIndex:turn.index,situation:turn.situation,keyAction:turn.action,outcome:turn.outcome,submitted:true},design:{tested:true,steps:['travel','stop','notify'],destination:'library',body:'cart',usage:'set-start',revision:'sequence',noticeMode:'light',noticeReason:'quiet',submitted:true},obstacle:{originalTested:true,prediction:'blocked',policy:'wait',testedPolicy:'wait',removed:true,reason:'rule',arrived:true,submitted:true},assessment:{form:0,answers:[1,null,0],repair:['travel','stop','notify'],submitted:true}};
 for(const [id,proof]of Object.entries(proofs))assert.equal(rules.completed(id,proof),true,'fixture '+id);
 const skipped={...empty(),records:{assessment:proofs.assessment}};
 saved=await api('/api/progress',{sid:'one',eventId:'out-of-order',version:1,payload:skipped},a.cookie);assert.equal(saved.status,200);assert.equal(saved.data.points,0);
 const full={...empty(),stage:'assessment',completions:proofs};
 saved=await api('/api/progress',{sid:'one',eventId:'all-complete',version:2,payload:full},a.cookie);assert.equal(saved.status,200);assert.equal(saved.data.points,85);assert.equal(saved.data.awards.length,5);
 saved=await api('/api/progress',{sid:'one',eventId:'all-complete',version:2,payload:full},a.cookie);assert.equal(saved.data.version,3);assert.equal(saved.data.points,85);
 saved=await api('/api/progress',{sid:'one',eventId:'practice-again',version:3,payload:empty()},a.cookie);assert.equal(saved.data.points,85);
 await stop();await start();assert.equal((await api('/api/me',undefined,a.cookie)).data.points,85);
 assert.equal((await api('/api/me',undefined,b.cookie)).data.points,0);
 assert.equal((await api('/api/logout',{},a.cookie)).status,200);
 assert.equal((await api('/api/me',undefined,a.cookie)).status,401);
 assert.equal((await api('/api/me',undefined,b.cookie)).status,200);
 assert.equal((await api('/api/logout',{role:'teacher'},teacher.cookie)).status,200);
 assert.equal((await api('/api/teacher/class?class=601',undefined,teacher.cookie)).status,401);
});
