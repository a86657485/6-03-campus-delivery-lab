const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../rules.js');
test('obstacle exit reports the next required action, never requires optional comparison',()=>{
 const r=R.standardRecord('obstacle'); delete r.comparison; r.submitted=false;
 assert.equal(R.obstacleNext(r),'ready');
 assert.equal(R.obstacleNext({...r,arrived:false}),'finish-delivery');
 assert.equal(R.obstacleNext({...r,reason:''}),'explain');
 assert.equal(R.obstacleNext({...r,policy:'help',testedPolicy:'help',resumed:false,arrived:false}),'confirm-resume');
});
test('robot design sheet accepts open functions and pairs each with a use method',()=>{
 const S=require('../robot-sheet.js'),sheet=S.example();
 assert.equal(S.complete(sheet,'humanoid'),true);
 assert.equal(S.complete({...sheet,functions:sheet.functions.map((f,i)=>i?f:{...f,use:''})},'cart'),false);
 assert.equal(S.complete({...sheet,otherShape:''},'other'),false);
 assert.equal(S.complete({...sheet,otherShape:'带雨棚的小车'},'other'),true);
 assert.equal(S.valid({...sheet,functions:'invalid'}),false);
});
test('new design sheet round trips in classroom payload while old records remain compatible',()=>{
 const S=require('../robot-sheet.js'),r=R.standardRecord('design');r.sheet=S.example();r.body='humanoid';
 const p={stage:'design',records:{design:r},completions:{},archives:[]};
 assert.equal(R.validPayload(p),true);assert.equal(R.completed('design',r),true);
 assert.equal(R.completed('design',{...r,sheet:{...r.sheet,instructionExample:''}}),false);
 delete r.sheet;r.body='cart';assert.equal(R.validPayload(p),true);
});
