'use strict';
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const rules=require('./rules.js');
const dir=process.env.DATA_DIR || path.join(__dirname,'runtime');
fs.mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'classroom.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,name TEXT NOT NULL,manual INTEGER DEFAULT 0,entered INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,sid TEXT,role TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS records(sid TEXT PRIMARY KEY,version INTEGER DEFAULT 0,payload TEXT NOT NULL,updated INTEGER);
CREATE TABLE IF NOT EXISTS awards(sid TEXT,stage TEXT,points INTEGER,created INTEGER,PRIMARY KEY(sid,stage));
CREATE TABLE IF NOT EXISTS events(sid TEXT,event_id TEXT,PRIMARY KEY(sid,event_id));`);
const roster=JSON.parse(fs.readFileSync(process.env.ROSTER_FILE || path.join(__dirname,'roster.json'),'utf8'));
const add=db.prepare('INSERT OR IGNORE INTO students(id,class_id,name) VALUES(?,?,?)');
const seen=new Set();
for(const s of roster){
  if(!/^60[1-6]$/.test(s.classId)||!s.id||!s.name||seen.has(s.id))throw Error('名单格式或年级不正确');
  seen.add(s.id);add.run(s.id,s.classId,s.name);
}
const passwordFile=path.join(dir,'teacher-password.txt');
const password=process.env.TEACHER_PASSWORD||'teacher';
fs.writeFileSync(passwordFile,password,{mode:0o600});
if(password.length<6)throw Error('教师密码至少6位');
const passwordHash=crypto.createHash('sha256').update(password).digest();
const attempts=new Map();
const empty=()=>({stage:'intro',records:{},completions:{},archives:[]});
function state(sid){
 const row=db.prepare('SELECT * FROM records WHERE sid=?').get(sid);
 const awards=db.prepare('SELECT stage,points,created FROM awards WHERE sid=?').all(sid);
 return {version:row?.version||0,payload:row?JSON.parse(row.payload):empty(),updated:row?.updated||null,awards,points:awards.reduce((a,r)=>a+r.points,0)};
}
function auth(req,role){
 const cookieName=role==='teacher'?'delivery_teacher':'delivery_student';
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 const s=token&&db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(token,Date.now());
 return s && (!role||s.role===role)?s:null;
}
function session(res,sid,role){
 const token=crypto.randomBytes(32).toString('hex');
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(token,sid,role,Date.now()+7*86400000);
 res.setHeader('Set-Cookie',`delivery_${role}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){
 let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>1024*1024)throw Error('提交内容过大');}
 try{return JSON.parse(data||'{}');}catch{throw Error('提交格式错误');}
}
function validate(payload){return rules.validPayload(payload);}
const files={'/assets/campus.png':'assets/campus.png','/assets/teacher-lan.png':'assets/teacher-lan.png','/assets/robot-xiaoda.png':'assets/robot-xiaoda.png','/':'index.html','/demo':'index.html','/test':'index.html','/index.html':'index.html','/app.js':'app.js','/story.js':'story.js','/scene.js':'scene.js','/sync.js':'sync.js','/style.css':'style.css','/rules.js':'rules.js','/teacher':'teacher.html','/teacher.html':'teacher.html','/teacher.js':'teacher.js'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
 try{
  const url=new URL(req.url,'http://localhost'), p=url.pathname;
  if(req.method==='POST'){
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'来源不允许'});
   if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'需要JSON格式'});
  }
  if(p==='/api/classes'&&req.method==='GET')return json(res,200,{classes:['601','602','603','604','605','606']});
  if(p==='/api/roster'&&req.method==='GET'){
   const cls=url.searchParams.get('class');if(!/^60[1-6]$/.test(cls))return json(res,400,{error:'请选择六年级班级'});
   return json(res,200,db.prepare('SELECT id,name,manual FROM students WHERE class_id=? ORDER BY manual,name').all(cls));
  }
  if(p==='/api/login'&&req.method==='POST'){
   const b=await body(req);if(!/^60[1-6]$/.test(b.classId))return json(res,400,{error:'请选择班级'});
   let s=b.id&&db.prepare('SELECT * FROM students WHERE id=? AND class_id=?').get(b.id,b.classId);
   if(!s&&!b.id){
    const name=typeof b.name==='string'?b.name.trim():'';
    if(!name||name.length>30)return json(res,400,{error:'请填写1至30字的姓名'});
    const matches=db.prepare('SELECT * FROM students WHERE class_id=? AND name=?').all(b.classId,name);
    if(matches.length>1)return json(res,409,{error:'有同名同学，请从名单中按编号选择'});
    s=matches[0];
    if(!s){s={id:crypto.randomUUID(),class_id:b.classId,name,manual:1};db.prepare('INSERT INTO students(id,class_id,name,manual) VALUES(?,?,?,1)').run(s.id,b.classId,name);}
   }
   if(!s)return json(res,400,{error:'请重新选择姓名'});
   db.prepare('UPDATE students SET entered=1 WHERE id=?').run(s.id);session(res,s.id,'student');return json(res,200,{student:s});
  }
  if(p==='/api/teacher/login'&&req.method==='POST'){
   const ip=req.socket.remoteAddress, now=Date.now(), previous=attempts.get(ip);
   const entry=previous&&now-previous.start<60000?previous:{count:0,start:now};
   if(entry.count>=10)return json(res,429,{error:'尝试过多，请一分钟后再试'});
   entry.count++;attempts.set(ip,entry);
   const b=await body(req), hash=crypto.createHash('sha256').update(String(b.password||'')).digest();
   if(!crypto.timingSafeEqual(hash,passwordHash))return json(res,401,{error:'教师密码不正确'});
   attempts.delete(ip);session(res,null,'teacher');return json(res,200,{ok:true});
  }
  if(p==='/api/logout'&&req.method==='POST'){
   const role=(await body(req)).role==='teacher'?'teacher':'student',s=auth(req,role);if(s)db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);
   res.setHeader('Set-Cookie',`delivery_${role}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return json(res,200,{ok:true});
  }
  if(p==='/api/me'&&req.method==='GET'){
   const s=auth(req,'student');if(!s)return json(res,401,{error:'请先选择班级和姓名'});
   return json(res,200,{student:db.prepare('SELECT * FROM students WHERE id=?').get(s.sid),...state(s.sid)});
  }
  if(p==='/api/progress'&&req.method==='POST'){
   const s=auth(req,'student');if(!s)return json(res,401,{error:'登录已过期，请重新登录'});
   const b=await body(req);
   if(b.sid!==s.sid)return json(res,403,{error:'当前页面属于另一位同学，请重新登录原身份后同步'});
   if(typeof b.eventId!=='string'||!b.eventId.trim()||b.eventId.length>80||!validate(b.payload)||!Number.isInteger(b.version))return json(res,400,{error:'学习记录格式不正确'});
   if(db.prepare('SELECT 1 FROM events WHERE sid=? AND event_id=?').get(s.sid,b.eventId))return json(res,200,state(s.sid));
   const old=state(s.sid);
   if(b.version!==old.version)return json(res,409,{error:'另一设备已有更新，已保留本机待同步记录',...old});
   db.exec('BEGIN IMMEDIATE');
   try{
    const now=Date.now();
    db.prepare('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(sid) DO UPDATE SET version=excluded.version,payload=excluded.payload,updated=excluded.updated').run(s.sid,old.version+1,JSON.stringify(b.payload),now);
    for(const [index,stage] of rules.stages.entries()){
     const unlocked=index===0||db.prepare('SELECT 1 FROM awards WHERE sid=? AND stage=?').get(s.sid,rules.stages[index-1].id);
     const valid=rules.completed(stage.id,b.payload.records[stage.id])||rules.completed(stage.id,b.payload.completions?.[stage.id]);
     if(unlocked&&valid)db.prepare('INSERT OR IGNORE INTO awards VALUES(?,?,?,?)').run(s.sid,stage.id,stage.points,now);
    }
    db.prepare('INSERT INTO events VALUES(?,?)').run(s.sid,b.eventId);
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return json(res,200,state(s.sid));
  }
  if(p==='/api/teacher/class'&&req.method==='GET'){
   if(!auth(req,'teacher'))return json(res,401,{error:'请先登录教师大屏'});
   const cls=url.searchParams.get('class');if(!/^60[1-6]$/.test(cls))return json(res,400,{error:'班级不正确'});
   const students=db.prepare('SELECT * FROM students WHERE class_id=? ORDER BY manual,name').all(cls).map(s=>({...s,...state(s.id)}));
   return json(res,200,{classId:cls,at:Date.now(),students});
  }
  if(p.startsWith('/api/'))return json(res,404,{error:'接口不存在'});
  if(req.method!=='GET'||!files[p])return json(res,404,{error:'页面不存在'});
  if(p==='/test'&&!auth(req,'teacher')){res.writeHead(302,{Location:'/teacher'});return res.end();}
  const file=files[p], ext=path.extname(file), type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'}[ext];
  const filePath=path.join(__dirname,file);
  if(!fs.existsSync(filePath))return json(res,404,{error:'页面不存在'});
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(filePath).on('error',()=>res.destroy()).pipe(res);
 }catch(e){console.error('Request failed:',e.message);if(!res.headersSent)json(res,400,{error:'请求未保存，请检查连接或提交内容后重试'});else res.end();}
});
const port=Number(process.env.PORT||8784),host=process.env.HOST||'0.0.0.0';
server.listen(port,host,()=>{
 const activePort=server.address().port;
 console.log(`校园配送课堂已启动：http://localhost:${activePort}  教师：http://localhost:${activePort}/teacher`);
 for(const list of Object.values(os.networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)console.log(`学生访问：http://${n.address}:${activePort}`);
 console.log('教师密码文件：'+passwordFile+'（或使用 TEACHER_PASSWORD 环境变量）');
});
