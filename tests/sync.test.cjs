'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('saving works on a LAN page where crypto.randomUUID is unavailable',()=>{
 let saved='';
 const context={window:{addEventListener(){}},setInterval(){},structuredClone,crypto:{getRandomValues(array){for(let i=0;i<array.length;i++)array[i]=i+1;return array;}},localStorage:{setItem(key,value){saved=value;},removeItem(){}},fetch(){return new Promise(()=>{});}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../sync.js'),'utf8'),context);
 context.window.Classroom.init({id:'lan-student'},{version:0,payload:{}},()=>{});
 assert.doesNotThrow(()=>context.window.Classroom.save({stage:'intro',records:{},completions:{},archives:[]}));
 assert.match(JSON.parse(saved).eventId,/^[0-9a-f-]{36}$/);
});
