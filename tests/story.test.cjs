'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Rules=require('../rules.js');
test('every required stage has a short immersive story beat',()=>{
 const Story=require('../story.js');
 for(const stage of Rules.stages){
  const beat=Story.get(stage.id);assert.ok(beat,'missing '+stage.id);assert.ok(beat.frames.length>=2&&beat.frames.length<=3);assert.ok(beat.cta);assert.ok(beat.title);assert.ok(beat.frames.every(frame=>['system','teacher','robot'].includes(frame.role)&&frame.text.length<=90));
 }
 assert.equal(Story.get('parameter'),null);
});
test('story assets are assigned only to speaking characters',()=>{
 const Story=require('../story.js');
 const frames=Rules.stages.flatMap(stage=>Story.get(stage.id).frames);
 assert.ok(frames.some(frame=>frame.asset==='/assets/teacher-lan-lite.png'));
 assert.ok(frames.some(frame=>frame.asset==='/assets/robot-xiaoda-lite.png'));
 assert.ok(frames.filter(frame=>frame.role==='system').every(frame=>!frame.asset));
});
