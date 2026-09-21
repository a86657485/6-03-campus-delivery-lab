(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Program=api;})(typeof window==='object'?window:this,function(){
'use strict';
const commands={forward:'前进一步',left:'向左转',right:'向右转',stop:'到站停止',notify:'发出提醒'};
const corridor=new Set([[2,7],[3,7],[4,7],[5,7],[6,7],[6,6],[6,5],[6,4],[6,3],[7,3],[8,3],[9,3],[10,3]].map(p=>p.join(',')));
function valid(code){return Array.isArray(code)&&code.length<=50&&code.every(c=>Object.prototype.hasOwnProperty.call(commands,c));}
function run(code){
 if(!valid(code))return null;
 const s={x:2,y:7,dir:0,stopped:false,notified:false,trace:[],error:null,errorAt:-1};
 const frame=(command,index)=>({x:s.x,y:s.y,dir:s.dir,stopped:s.stopped,notified:s.notified,command,index});
 s.trace.push(frame('start',-1));
 for(let i=0;i<code.length;i++){
  const c=code[i];
  if(c==='left')s.dir=(s.dir+3)%4;
  if(c==='right')s.dir=(s.dir+1)%4;
  if(c==='forward'){
   const delta=[[1,0],[0,1],[-1,0],[0,-1]][s.dir],nx=s.x+delta[0],ny=s.y+delta[1];
   if(!corridor.has(nx+','+ny)){s.error='wall';s.errorAt=i;s.trace.push(frame(c,i));break;}
   s.x=nx;s.y=ny;s.stopped=false;s.notified=false;
  }
  if(c==='stop')s.stopped=true;
  if(c==='notify'){
   if(s.x!==10||s.y!==3||!s.stopped){s.error='early-notify';s.errorAt=i;s.trace.push(frame(c,i));break;}
   s.notified=true;
  }
  s.trace.push(frame(c,i));
 }
 if(!s.error){
  if(s.x!==10||s.y!==3){s.error='wrong-place';s.errorAt=code.length;}
  else if(!s.stopped){s.error='missing-stop';s.errorAt=code.length;}
  else if(!s.notified){s.error='missing-notify';s.errorAt=code.length;}
 }
 s.success=!s.error;
 return s;
}
return {commands,valid,run};
});
