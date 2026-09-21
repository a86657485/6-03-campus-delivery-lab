const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../rules.js');
test('two quiz forms each contain at least twenty curriculum-aligned items',()=>{
 const Q=require('../quiz-bank.js');
 for(const form of [0,1]){const questions=Q.form(form);assert.ok(questions.length>=20);assert.equal(new Set(questions.map(x=>x.id)).size,questions.length);assert.ok(questions.every(q=>q.options.length===3&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3));}
});
test('quiz requires all 20 submitted answers and preserves first and latest score',()=>{
 const Q=require('../quiz-bank.js');const correct=Q.form(0).map(q=>q.answer),r={form:0,answers:correct,submitted:false};
 assert.equal(R.completed('assessment',r),false);r.submitted=true;assert.equal(R.completed('assessment',r),true);
 assert.equal(R.assessmentResult({...r,answers:correct.slice(1)}),0);
 assert.equal(R.assessmentResult(r),20);
});
test('student program executes discrete commands and exposes collision and correction',()=>{
 const P=require('../program.js');
 const route=[...Array(4).fill('forward'), 'left',...Array(4).fill('forward'),'right',...Array(4).fill('forward'),'stop','notify'];
 const result=P.run(route);
 assert.equal(result.success,true);assert.deepEqual([result.x,result.y],[10,3]);assert.equal(result.trace.length,route.length+1);
 const bad=P.run([...Array(5).fill('forward')]);
 assert.equal(bad.success,false);assert.equal(bad.error,'wall');assert.equal(bad.errorAt,4);
 assert.equal(P.run([...route.slice(0,-2),'notify','stop']).success,false);
});
test('final robot design follows quiz and is independently scored',()=>{
 const S=require('../robot-sheet.js');
 const sheet=S.example();
 assert.equal(R.completed('robot',{body:'cart',sheet,submitted:false}),false);
 assert.equal(R.completed('robot',{body:'cart',sheet,submitted:true}),true);
 assert.equal(R.validPayload({stage:'robot',records:{robot:{body:'cart',sheet,submitted:true}},completions:{},archives:[]}),true);
});
