'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const R=require('../rules.js'),Q=require('../quiz-bank.js'),P=require('../program.js'),S=require('../robot-sheet.js');
const route=[...Array(4).fill('forward'),'left',...Array(4).fill('forward'),'right',...Array(4).fill('forward'),'stop','notify'];
test('each assessment form has twenty distinct valid situations with balanced answers',()=>{
 for(const form of [0,1]){const questions=Q.form(form);a.equal(questions.length,20);a.equal(new Set(questions.map(q=>q.q)).size,20);a.ok(questions.every(q=>q.options.length===3&&q.answer>=0&&q.answer<3));const counts=[0,1,2].map(n=>questions.filter(q=>q.answer===n).length);a.ok(Math.max(...counts)-Math.min(...counts)<=3);}
});
test('twenty answers are required; first and latest scores remain separate',()=>{
 const correct=Q.form(0).map(q=>q.answer),r={form:0,answers:correct,submitted:true,first:{form:0,answers:correct.map(()=>0)},history:[]};
 a.equal(R.assessmentResult(r),20);a.equal(R.completed('assessment',r),true);
 a.equal(R.completed('assessment',{...r,answers:correct.slice(1)}),false);
 a.equal(R.assessmentResult({...r,answers:correct.slice(1)}),0);
 a.equal(R.assessmentTotal(r),20);
 a.equal(R.validPayload({stage:'assessment',records:{assessment:r},completions:{},archives:[]}),true);
});
test('student program reveals the first bad command and supports correction',()=>{
 const ok=P.run(route);a.equal(ok.success,true);a.deepEqual([ok.x,ok.y],[10,3]);a.equal(ok.trace.length,route.length+1);
 const wall=P.run(Array(5).fill('forward'));a.equal(wall.error,'wall');a.equal(wall.errorAt,4);
 a.equal(P.run([...route.slice(0,-2),'notify','stop']).error,'early-notify');
 const record={code:route,prediction:'wall',first:Array(5).fill('forward'),history:[{code:Array(5).fill('forward'),prediction:'wall',result:'wall',errorAt:4},{code:route,prediction:'delivered',result:'success',errorAt:-1}],explanation:'control',submitted:true};
 a.equal(R.completed('program',record),true);
 a.equal(R.validPayload({stage:'program',records:{program:record},completions:{},archives:[]}),true);
 a.equal(R.completed('program',{...record,history:record.history.slice(1)}),false);
});
test('final design requires all textbook fields after the assessment',()=>{
 const sheet=S.example(),record={body:'cart',sheet,submitted:true};
 a.equal(R.completed('robot',record),true);
 a.equal(R.completed('robot',{...record,sheet:{...sheet,instructionExample:''}}),false);
 a.equal(R.validPayload({stage:'robot',records:{robot:record},completions:{},archives:[]}),true);
 a.equal(S.complete({...sheet,otherShape:'带雨棚的车'},'other'),true);
 a.equal(S.complete({...sheet,functions:[sheet.functions[0],sheet.functions[0],sheet.functions[2]]},'cart'),false);
 for(const stage of R.stages)a.equal(R.completed(stage.id,R.standardRecord(stage.id)),true,stage.id);
});
test('legacy completed assessment remains readable after upgrade',()=>{
 const legacy={form:0,answers:[1,null,0],repair:['travel','stop','notify'],submitted:true};
 a.equal(R.completed('assessment',legacy),true);a.equal(R.assessmentTotal(legacy),3);
 a.equal(R.validPayload({stage:'assessment',records:{assessment:legacy},completions:{assessment:legacy},archives:[]}),true);
});
