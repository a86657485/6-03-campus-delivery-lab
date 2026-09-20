'use strict';
window.Classroom=(()=>{
 let student=null,version=0,busy=false,blocked=false,epoch=0,callback=()=>{},pending=null;
 const key=id=>'delivery-v1:'+id;
 function eventId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 }
 async function api(url,data){const res=await fetch(url,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const b=await res.json();if(!res.ok){const e=Error(b.error||'连接失败');e.status=res.status;e.data=b;throw e;}return b;}
 function disk(){if(!student)return;try{if(pending)localStorage.setItem(key(student.id),JSON.stringify(pending));else localStorage.removeItem(key(student.id));}catch{callback('storage','本机空间不足，请立即导出实验记录');}}
 function init(s,data,cb){epoch++;student=s;version=data.version;callback=cb;blocked=false;pending=null;try{pending=JSON.parse(localStorage.getItem(key(s.id))||'null');}catch{callback('storage','本机记录读取失败，请导出当前记录');}if(pending&&pending.version!==version){blocked=true;callback('conflict','另一设备已有更新，本机记录已保留');}else if(pending)callback('pending','本机有待同步记录');return pending?.payload||data.payload;}
 function save(payload){if(!student)return;pending={sid:student.id,eventId:eventId(),version,payload:structuredClone(payload)};disk();callback(blocked?'conflict':'pending',blocked?'另一设备已有更新，请处理同步冲突':'已保存在本机，正在同步');flush();}
 async function flush(){if(!student||!pending||busy||blocked)return;busy=true;const request=pending,captured=epoch;try{const data=await api('/api/progress',request);if(captured!==epoch)return;version=data.version;if(pending===request)pending=null;else if(pending){pending.version=version;pending.eventId=eventId();}disk();callback('saved','已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour12:false}),data);}catch(e){if(captured!==epoch)return;if(e.status===409){blocked=true;callback('conflict','另一设备已有更新，请先导出本机记录');}else if(e.status===401||e.status===403){blocked=true;callback('identity','登录身份已变化，本机记录保留，请重新登录');}else if(e.status===400){blocked=true;callback('invalid','记录校验未通过，请导出并联系老师');}else callback('offline','尚未同步 · 已保存在本机，联网后重试');}finally{busy=false;if(captured===epoch&&pending&&pending!==request&&!blocked)flush();}}
 async function useServer(){const data=await api('/api/me');if(data.student.id!==student.id)throw Error('身份不一致，请重新登录');pending=null;blocked=false;version=data.version;disk();callback('saved','已载入课堂已同步记录',data);return data.payload;}
 function detach(){epoch++;student=null;pending=null;blocked=false;}
 setInterval(flush,5000);window.addEventListener('online',flush);
 return {api,init,save,flush,useServer,detach};
})();
