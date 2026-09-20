const {test}=require('node:test');const a=require('node:assert/strict');const R=require('../rules.js');
const route=['go',...Array(4).fill('tick'),'stop','left','slow','go',...Array(4).fill('tick'),'stop','right','go',...Array(4).fill('tick'),'stop'];
test('manual goal requires a real key moment with matching observation and outcome',()=>{
 a.equal(R.manual(route).arrived,true);a.equal(R.manual(route.slice(0,-1)).arrived,false);
 const moment=R.manualMoments(route).find(m=>m.action==='stop'&&m.situation==='receiver');
 const proof={actions:route,keyIndex:moment.index,situation:'receiver',keyAction:'stop',outcome:'stopped-target',submitted:true};
 a.equal(R.completed('manual',proof),true);
 a.equal(R.completed('manual',{...proof,situation:'corner'}),false);
 a.equal(R.completed('manual',{...proof,submitted:false}),false);
});
test('collision stops before leaving corridor',()=>{const s=R.manual(['go',...Array(20).fill('tick')]);a.equal(s.x,6);a.equal(s.moving,false);a.equal(s.collision,true)});
test('auto task validates delivery outcome and a justified reminder mode',()=>{
 const base={steps:['travel','stop','notify'],destination:'library'};
 a.equal(R.design(base).ok,true);
 const proof={...base,tested:true,body:'cart',usage:'set-start',revision:'sequence',noticeMode:'light',noticeReason:'quiet',submitted:true};
 a.equal(R.completed('design',proof),true);
 a.equal(R.completed('design',{...proof,noticeMode:'sound',noticeReason:'hear'}),true);
 a.equal(R.completed('design',{...proof,noticeMode:'sound',noticeReason:'quiet'}),false);
 a.equal(R.completed('design',{...proof,submitted:false}),false);
});
test('auto task feedback matches the actual reminder moment',()=>{
 a.equal(R.design({steps:['notify','travel','stop'],destination:'library'}).kind,'start-notice');
 a.match(R.design({steps:['notify','travel','stop'],destination:'library'}).message,/出发前/);
 a.equal(R.design({steps:['travel','notify','stop'],destination:'library'}).kind,'moving-notice');
 a.match(R.design({steps:['travel','notify','stop'],destination:'library'}).message,/到达.*仍在移动/);
 a.equal(R.design({steps:['travel','notify'],destination:'library'}).kind,'overshoot');
});
test('auto task timeline executes cards in the chosen order',()=>{
 const early=R.designTimeline({steps:['notify','travel','stop'],destination:'library'});
 a.deepEqual(early.frames.filter(f=>f.step!=='travel').map(f=>f.step),['notify','stop']);
 a.deepEqual([early.frames[0].x,early.frames[0].y],[2,7]);
 a.equal(early.frames[0].notice,true);
 a.deepEqual([early.frames.at(-1).x,early.frames.at(-1).y],[10,3]);
 a.equal(early.frames.at(-1).moving,false);
 const missingStop=R.designTimeline({steps:['travel','notify'],destination:'library'});
 a.equal(missingStop.frames.at(-1).step,'drift');
 a.deepEqual([missingStop.frames.at(-1).x,missingStop.frames.at(-1).y],[11,3]);
 const correct=R.designTimeline({steps:['travel','stop','notify'],destination:'library'});
 a.deepEqual(correct.frames.filter(f=>f.step!=='travel').map(f=>f.step),['stop','notify']);
 a.deepEqual([correct.frames.at(-1).x,correct.frames.at(-1).y],[10,3]);
});
test('both obstacle policies require actual arrival before completion',()=>{
 a.equal(R.obstacle('wait',false,false).status,'waiting');a.equal(R.obstacle('wait',true,false).status,'delivered');
 a.equal(R.obstacle('help',true,false).status,'needs-human');a.equal(R.obstacle('help',true,true).status,'delivered');
 const proof={originalTested:true,prediction:'blocked',policy:'wait',testedPolicy:'wait',removed:true,resumed:false,reason:'rule',arrived:false,submitted:true};
 a.equal(R.completed('obstacle',proof),false);a.equal(R.completed('obstacle',{...proof,arrived:true}),true);a.equal(R.completed('obstacle',{...proof,arrived:true,submitted:false}),false);
});
test('intro answers remain a draft until submitted',()=>{a.equal(R.completed('intro',{answers:[0,1],submitted:false}),false);a.equal(R.completed('intro',{answers:[0,1],submitted:true}),true)});
test('teacher test mode has a valid standard record for every required stage',()=>{
 for(const stage of R.stages){const record=R.standardRecord(stage.id);a.ok(record,'missing '+stage.id);a.equal(R.completed(stage.id,record),true,'invalid '+stage.id);}
 a.equal(R.standardRecord('unknown'),null);
});
test('assessment combines judgment, sequence repair and explanation',()=>{
 const correct={form:0,answers:[1,null,0],repair:['travel','stop','notify'],submitted:true};
 a.equal(R.assessmentResult(correct),3);
 a.equal(R.assessmentResult({...correct,repair:['travel','notify','stop']}),2);
 a.equal(R.completed('assessment',{...correct,submitted:false}),false);
 a.equal(R.completed('assessment',correct),true);
});
test('assessment evidence reads the first and latest submitted attempts',()=>{
 const record={first:{form:0,answers:[0,null,0],repair:['travel','notify','stop']},submitted:false,history:[{form:0,answers:[1,null,0],repair:['travel','stop','notify'],score:3},{form:1,answers:[2,null,0],repair:['travel','stop','notify'],score:2}]};
 a.equal(R.assessmentScore(record,'first'),1);a.equal(R.assessmentScore(record,'latest'),2);
});
test('assessment history accepts only a correctly recomputed score',()=>{
 const base={stage:'assessment',records:{},completions:{},archives:[]};
 const attempt={form:0,answers:[1,null,0],repair:['travel','stop','notify'],score:3};
 a.equal(R.validPayload({...base,records:{assessment:{form:0,answers:[1,null,0],repair:['travel','stop','notify'],history:[attempt]}}}),true);
 a.equal(R.validPayload({...base,records:{assessment:{form:0,answers:[1,null,0],repair:['travel','stop','notify'],history:[{...attempt,score:2}]}}}),false);
});
test('reject malformed nested records and forged completion',()=>{
 const base={stage:'intro',records:{},completions:{},archives:[]};
 a.equal(R.validPayload(base),true);
 a.equal(R.validPayload({...base,stage:'bogus'}),false);
 a.equal(R.validPayload({...base,records:{manual:{actions:Array(3001).fill('tick')}}}),false);
 a.equal(R.validPayload({...base,records:{intro:{answers:[0,1],first:'bad'}}}),false);
 a.equal(R.validPayload({...base,records:{assessment:{form:99,answers:[1,null,0],repair:['travel','stop','notify']}}}),false);
 a.equal(R.validPayload({...base,records:{assessment:{form:0,answers:[1,null,0],repair:['travel','stop','notify'],history:[{form:99,answers:[1,null,0],repair:['travel','stop','notify']}]}}}),false);
 a.equal(R.validPayload({...base,records:{design:{steps:['travel'],history:[{steps:'bad'}]}}}),false);
 a.equal(R.completed('manual',{actions:['stop'],reason:'adjust'}),false);
});
