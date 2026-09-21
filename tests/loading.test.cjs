'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('LAN saving does not depend on secure-context structuredClone',()=>{
 let saved='';
 const context={window:{addEventListener(){}},setInterval(){},crypto:{getRandomValues(a){return a.fill(1);}},localStorage:{setItem(k,v){saved=v;},removeItem(){}},fetch(){return new Promise(()=>{});}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../sync.js'),'utf8'),context);
 context.window.Classroom.init({id:'test'},{version:0,payload:{}},()=>{});
 context.window.Classroom.save({stage:'intro',records:{},completions:{},archives:[]});
 assert.equal(JSON.parse(saved).payload.stage,'intro');
});
test('map has a vector fallback and a regular HTML background image',()=>{
 let onError;const context={window:{},document:{addEventListener(type,handler){if(type==='error')onError=handler;}},Rules:{path:[[0,0],[1,1]]}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../scene.js'),'utf8'),context);
 const markup=context.window.Scene.markup();
 assert.match(markup,/class="map-fallback"/);
 assert.match(markup,/<img class="map-background"/);
 assert.doesNotMatch(markup,/<image href=/);
 const broken={style:{},matches(selector){return selector==='.map-background';}};
 onError({target:broken});assert.equal(broken.style.display,'none');
});
