(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Rules=api;})(typeof window==='object'?window:this,function(){
'use strict';
const stages=[{id:'intro',title:'领取配送任务',points:5},{id:'manual',title:'我来控制',points:20},{id:'design',title:'机器人接手',points:25},{id:'obstacle',title:'应对新情况',points:25},{id:'assessment',title:'独立检验',points:10}];
const path=[[2,7],[3,7],[4,7],[5,7],[6,7],[6,6],[6,5],[6,4],[6,3],[7,3],[8,3],[9,3],[10,3]];
const allowedActions=['go','stop','left','right','slow','normal','tick'];
function manual(actions){
 const s={x:2,y:7,dir:0,moving:false,speed:1,collision:false,arrived:false,trace:[[2,7]],turns:0};
 if(!Array.isArray(actions)||actions.length>3000||actions.some(a=>!allowedActions.includes(a)))return null;
 for(const a of actions){
  if(a==='go'){s.moving=true;s.collision=false;}if(a==='stop')s.moving=false;
  if(a==='slow')s.speed=1;if(a==='normal')s.speed=2;
  if(a==='left'||a==='right'){s.dir=(s.dir+(a==='left'?3:1))%4;s.turns++;}
  if(a==='tick'&&s.moving){const d=[[1,0],[0,1],[-1,0],[0,-1]][s.dir],x=s.x+d[0],y=s.y+d[1];
   if(path.some(p=>p[0]===x&&p[1]===y)||x===11&&y===3){s.x=x;s.y=y;s.trace.push([x,y]);}else{s.moving=false;s.collision=true;}}
 }
 s.arrived=s.x===10&&s.y===3&&!s.moving&&actions.at(-1)==='stop';return s;
}
function manualMoments(actions){
 if(!Array.isArray(actions)||!manual(actions))return [];
 const moments=[];
 for(let index=0;index<actions.length;index++){
  const action=actions[index];
  if(!['left','right','stop','slow','normal'].includes(action))continue;
  const before=manual(actions.slice(0,index)),after=manual(actions.slice(0,index+1));
  let situation='observe',outcome='paused';
  if(action==='left'||action==='right'){situation='corner';outcome='new-direction';}
  if(action==='slow'||action==='normal'){situation='need-observe';outcome='speed-changed';}
  if(action==='stop'&&after.x===10&&after.y===3){situation='receiver';outcome='stopped-target';}
  moments.push({index,action,situation,outcome,x:after.x,y:after.y,before:{x:before.x,y:before.y,dir:before.dir},after:{x:after.x,y:after.y,dir:after.dir}});
 }
 return moments;
}
function design(d){
 if(!d||!Array.isArray(d.steps))return {ok:false,message:'先设计配送任务。'};
 const travel=d.steps.indexOf('travel'),stop=d.steps.indexOf('stop'),notice=d.steps.indexOf('notify');
 if(travel<0)return {ok:false,kind:'stay',message:'机器人留在原处，尚未执行前往目的地的任务。'};
 if(d.destination!=='library')return {ok:false,kind:'wrong-place',message:'机器人到达了器材室，图书还没有送到阅览室。'};
 if(stop<travel)return {ok:false,kind:'overshoot',message:'机器人经过接收区后仍在移动，图书没有停在接收位置。'};
 if(notice<0)return {ok:false,kind:'silent',message:'机器人停在接收区，但管理员还没有收到到达提醒。'};
 if(notice<travel)return {ok:false,kind:'start-notice',message:'机器人在出发前就发出了提醒，到站后没有再提醒管理员。'};
 if(notice<stop)return {ok:false,kind:'moving-notice',message:'机器人到达接收区时仍在移动，就发出了提醒；还没有完成到站停止。'};
 return {ok:true,kind:'delivered',message:'图书送达、停好，并发出了到达提醒。'};
}
function designTimeline(d){
 const frames=[],destinationIndex=d?.destination==='library'?path.length-1:6;
 let index=0,moving=false,notice=false,trace=[path[0]];
 const frame=(step,label,override={})=>frames.push({x:path[index][0],y:path[index][1],dir:index>4&&index<=8?3:0,moving,notice,trace:trace.map(p=>p.slice()),step,label,...override});
 for(const step of Array.isArray(d?.steps)?d.steps:[]){
  if(step==='notify'){
   notice=true;frame('notify','现在发出到达提醒');notice=false;
  }else if(step==='stop'){
   moving=false;frame('stop','现在执行到站停止');
  }else if(step==='travel'){
   moving=true;
   while(index<destinationIndex){index++;trace.push(path[index]);frame('travel','正在执行前往目的地');}
  }
 }
 if(moving){
  const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][index>4&&index<=8?3:0];
  frames.push({x:path[index][0]+dx,y:path[index][1]+dy,dir:index>4&&index<=8?3:0,moving:true,notice:false,trace:trace.map(p=>p.slice()),step:'drift',label:'未执行停止，机器人继续向前'});
 }
 return {frames,result:design(d)};
}
function obstacle(policy,removed,resumed){
 if(!['wait','help'].includes(policy))return {status:'blocked',message:'前方受阻。保护机制使机器人停止，但配送方案还没有说明下一步。'};
 if(!removed)return {status:policy==='wait'?'waiting':'helping',message:policy==='wait'?'检测到纸箱，机器人停止等待通道恢复。':'检测到纸箱，机器人停止并发出求助信号。'};
 if(policy==='help'&&!resumed)return {status:'needs-human',message:'纸箱已经移走。求助规则仍等待管理员确认继续。'};
 return {status:'delivered',message:'按照设定的规则继续配送，完成送达。'};
}
const questions=[
 [{q:'小车快要经过接收区了。怎样体现你正在控制它？',options:['给它换一种外形','根据位置让它停下','只看启动灯是否亮起']},{q:'管理员按下启动后不再逐步操作，机器人仍能送货，主要依靠什么？',options:['轮子会自己判断目的地','只要电源接通就会成功','内部按照设定的指令和规则运行']},{q:'新障碍挡住原路线。哪种设计更合理？',options:['检测到障碍先停止，再按规则等待或求助','保持原动作，让机器人一直向前','更换外壳颜色，原规则不用变']}],
 [{q:'图书车转弯后偏离目的方向，你应该怎样做？',options:['只重新接通电源','把提醒声音调大','观察位置并调整前进方向']},{q:'两个机器人都已启动，为什么一个到站停下，另一个继续行驶？',options:['它们执行的控制规则不同','外形不同就一定动作不同','所有机器人本来都随意运行']},{q:'机器人设置为遇障碍停止求助。纸箱移走后，怎样继续？',options:['默认它已有自动绕路能力','按求助规则由管理员确认继续','删除到站停止任务']}]
];
const answers=[[1,2,0],[2,0,1]];
function score(a,form=0){return Array.isArray(a)&&answers[form]?answers[form].reduce((n,v,i)=>n+(a[i]===v),0):0;}
function assessmentResult(record){
 if(!record||![0,1].includes(record.form)||!Array.isArray(record.answers))return 0;
 const repair=Array.isArray(record.repair)&&record.repair.join(',')==='travel,stop,notify';
 return Number(record.answers[0]===answers[record.form][0])+Number(repair)+Number(record.answers[2]===answers[record.form][2]);
}
function assessmentScore(record,which='latest'){
 if(!record||typeof record!=='object')return null;
 const attempt=which==='first'?record.first:record.history?.at(-1);
 return attempt&&[0,1].includes(attempt.form)&&Array.isArray(attempt.answers)?assessmentResult(attempt):null;
}
function completed(id,r){
 if(!r||typeof r!=='object')return false;
 if(id==='intro')return r.submitted===true&&Array.isArray(r.answers)&&r.answers.length===2&&r.answers.every(x=>[0,1].includes(x));
 if(id==='manual'){const s=manual(r.actions),moment=manualMoments(r.actions).find(m=>m.index===r.keyIndex);return r.submitted===true&&!!s?.arrived&&s.turns>=2&&!!moment&&moment.action===r.keyAction&&moment.situation===r.situation&&moment.outcome===r.outcome;}
 if(id==='design'){const noticeMatches=r.noticeMode==='light'&&r.noticeReason==='quiet'||r.noticeMode==='sound'&&r.noticeReason==='hear';return r.submitted===true&&!!r.tested&&design(r).ok&&['cart','box'].includes(r.body)&&r.usage==='set-start'&&noticeMatches&&['first','stop','notify','destination','sequence'].includes(r.revision);}
 if(id==='obstacle')return r.submitted===true&&!!r.originalTested&&['blocked','continue','detour'].includes(r.prediction)&&['wait','help'].includes(r.policy)&&r.testedPolicy===r.policy&&r.removed===true&&r.arrived===true&&obstacle(r.policy,r.removed,r.resumed).status==='delivered'&&r.reason==='rule';
 if(id==='assessment')return r.submitted===true&&assessmentResult(r)===3;
 return false;
}
function standardRecord(id){
 if(id==='intro')return {answers:[1,0],submitted:true,first:[1,0]};
 if(id==='manual'){
  const actions=['go',...Array(4).fill('tick'),'stop','left','slow','go',...Array(4).fill('tick'),'stop','right','go',...Array(4).fill('tick'),'stop'];
  const moment=manualMoments(actions).find(m=>m.action==='stop'&&m.situation==='receiver');
  return {actions,hints:0,keyIndex:moment.index,situation:moment.situation,keyAction:moment.action,outcome:moment.outcome,submitted:true};
 }
 if(id==='design')return {steps:['travel','stop','notify'],destination:'library',body:'cart',usage:'set-start',noticeMode:'light',noticeReason:'quiet',tested:true,history:[],hints:0,result:'图书送达、停好，并发出了到达提醒。',first:{steps:['travel','stop','notify'],destination:'library'},revision:'sequence',submitted:true};
 if(id==='obstacle')return {policy:'wait',history:[{policy:'wait',result:'检测到纸箱，机器人停止等待通道恢复。'}],hints:0,prediction:'blocked',result:'按照设定的规则继续配送，完成送达。',originalTested:true,testedPolicy:'wait',removed:true,resumed:false,arrived:true,reason:'rule',submitted:true};
 if(id==='assessment'){
  const attempt={form:0,answers:[1,null,0],repair:['travel','stop','notify']};
  return {...attempt,submitted:true,first:{...attempt,answers:attempt.answers.slice(),repair:attempt.repair.slice()},history:[{...attempt,answers:attempt.answers.slice(),repair:attempt.repair.slice(),score:3}]};
 }
 return null;
}
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const bool=v=>v===undefined||typeof v==='boolean';
const text=(v,max=300)=>v===undefined||typeof v==='string'&&v.length<=max;
const oneOf=(v,values)=>v===undefined||values.includes(v);
const onlyKeys=(v,keys)=>Object.keys(v).every(k=>keys.includes(k));
const answersValid=(v,length,max,complete=false)=>Array.isArray(v)&&v.length<=(length)&&(!complete||v.length===length)&&v.every(x=>x===null&&!complete||Number.isInteger(x)&&x>=0&&x<=max);
const stepsValid=v=>Array.isArray(v)&&v.length<=3&&new Set(v).size===v.length&&v.every(x=>['travel','stop','notify'].includes(x));
const assessmentAnswersValid=(v,complete=false)=>Array.isArray(v)&&v.length===3&&v[1]===null&&[0,2].every(i=>complete?Number.isInteger(v[i])&&v[i]>=0&&v[i]<=2:v[i]===null||Number.isInteger(v[i])&&v[i]>=0&&v[i]<=2);
function attemptValid(v){return object(v)&&onlyKeys(v,['form','answers','repair','score'])&&[0,1].includes(v.form)&&assessmentAnswersValid(v.answers,true)&&stepsValid(v.repair)&&(v.score===undefined||v.score===assessmentResult(v));}
function designSnapshotValid(v){return object(v)&&onlyKeys(v,['steps','destination'])&&stepsValid(v.steps)&&['','library','equipment'].includes(v.destination);}
function validRecord(id,r){
 if(!object(r))return false;
 if(id==='intro')return onlyKeys(r,['answers','submitted','first'])&&(!r.answers||answersValid(r.answers,2,1))&&bool(r.submitted)&&(r.first===undefined||answersValid(r.first,2,1,true));
 if(id==='manual')return onlyKeys(r,['actions','hints','keyIndex','situation','keyAction','outcome','submitted'])&&(!r.actions||!!manual(r.actions))&&bool(r.submitted)&&(r.hints===undefined||Number.isInteger(r.hints)&&r.hints>=0&&r.hints<=3)&&(r.keyIndex===undefined||Number.isInteger(r.keyIndex)&&r.keyIndex>=0)&&oneOf(r.situation,['','corner','receiver','need-observe','observe'])&&oneOf(r.keyAction,['','left','right','stop','slow','normal'])&&oneOf(r.outcome,['','new-direction','stopped-target','speed-changed','paused']);
 if(id==='design'){
  if(!onlyKeys(r,['steps','destination','body','usage','tested','history','hints','result','first','idea','revision','noticeMode','noticeReason','helpTopic','submitted']))return false;
  if(r.steps&&!stepsValid(r.steps)||!oneOf(r.destination,['','library','equipment'])||!oneOf(r.body,['cart','box'])||!oneOf(r.usage,['','set-start','only-power'])||!oneOf(r.noticeMode,['','light','sound'])||!oneOf(r.noticeReason,['','quiet','hear'])||!oneOf(r.helpTopic,['','direction','stop','notice','result'])||!bool(r.tested)||!bool(r.submitted)||!text(r.result,300)||!text(r.idea,300)||!oneOf(r.revision,['','first','stop','notify','destination','sequence']))return false;
  if(r.hints!==undefined&&(!Number.isInteger(r.hints)||r.hints<0||r.hints>3)||r.first!==undefined&&!designSnapshotValid(r.first))return false;
  return r.history===undefined||Array.isArray(r.history)&&r.history.length<=12&&r.history.every(h=>object(h)&&onlyKeys(h,['steps','destination','result'])&&stepsValid(h.steps)&&['','library','equipment'].includes(h.destination)&&text(h.result,300));
 }
 if(id==='obstacle'){
  if(!onlyKeys(r,['policy','history','hints','originalTested','prediction','result','testedPolicy','removed','resumed','reason','arrived','comparison','helpTopic','submitted']))return false;
  if(!oneOf(r.policy,['','wait','help'])||!oneOf(r.testedPolicy,['','wait','help'])||!oneOf(r.prediction,['','blocked','continue','detour'])||!oneOf(r.reason,['','rule','self','shape'])||!oneOf(r.helpTopic,['','prediction','difference','resume'])||!bool(r.originalTested)||!bool(r.removed)||!bool(r.resumed)||!bool(r.arrived)||!bool(r.submitted)||!text(r.result,300)||!text(r.comparison,300))return false;
  if(r.hints!==undefined&&(!Number.isInteger(r.hints)||r.hints<0||r.hints>3))return false;
  return r.history===undefined||Array.isArray(r.history)&&r.history.length<=12&&r.history.every(h=>object(h)&&onlyKeys(h,['policy','result'])&&['wait','help'].includes(h.policy)&&text(h.result,300));
 }
 if(id==='assessment')return onlyKeys(r,['form','answers','repair','submitted','first','history'])&&oneOf(r.form,[0,1])&&(!r.answers||assessmentAnswersValid(r.answers))&&(r.repair===undefined||stepsValid(r.repair))&&bool(r.submitted)&&(r.first===undefined||attemptValid(r.first))&&(r.history===undefined||Array.isArray(r.history)&&r.history.length<=12&&r.history.every(attemptValid));
 if(id==='parameter')return onlyKeys(r,['distance','speed','trials'])&&oneOf(r.distance,[2,4,6,8])&&oneOf(r.speed,[1,2])&&(r.trials===undefined||Array.isArray(r.trials)&&r.trials.length<=12&&r.trials.every(t=>object(t)&&onlyKeys(t,['distance','speed','time','prediction'])&&[2,4,6,8].includes(t.distance)&&[1,2].includes(t.speed)&&t.time===t.distance/t.speed&&['first','less','same','more'].includes(t.prediction)));
 return false;
}
function validPayload(p){
 if(!p||!stages.some(s=>s.id===p.stage)||!p.records||Array.isArray(p.records)||typeof p.records!=='object'||!Array.isArray(p.archives)||p.archives.length>100)return false;
 if(JSON.stringify(p).length>300000)return false;
 if(p.story!==undefined&&(!object(p.story)||!onlyKeys(p.story,['seen'])||!Array.isArray(p.story.seen)||p.story.seen.length>stages.length||new Set(p.story.seen).size!==p.story.seen.length||p.story.seen.some(id=>!stages.some(s=>s.id===id))))return false;
 const permitted=[...stages.map(s=>s.id),'parameter'];
 for(const [id,r]of Object.entries(p.records)){
  if(!permitted.includes(id)||!validRecord(id,r))return false;
 }
 if(!p.archives.every(a=>object(a)&&onlyKeys(a,['stage','actions','at'])&&a.stage==='manual'&&!!manual(a.actions)&&Number.isFinite(a.at)))return false;
 if(p.completions){if(typeof p.completions!=='object'||Array.isArray(p.completions))return false;for(const [id,r]of Object.entries(p.completions))if(!completed(id,r))return false;}
 return true;
}
return {stages,path,manual,manualMoments,design,designTimeline,obstacle,questions,score,assessmentResult,assessmentScore,completed,standardRecord,validPayload};
});
