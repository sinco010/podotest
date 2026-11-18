import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
export default async (req)=>{
  const store=getStore('push-subs');
  let sub;
  try{sub=await req.json()}catch(e){return J({ok:false,error:'bad json'},400)}
  if(!sub||!sub.endpoint||!sub.keys||!sub.keys.p256dh||!sub.keys.auth)return J({ok:false,error:'bad subscription'},400);
  if(!/^https:\/\//.test(sub.endpoint))return J({ok:false,error:'bad endpoint'},400);
  const id=createHash('sha256').update(sub.endpoint).digest('hex').slice(0,40);
  if(req.method==='DELETE'){await store.delete(id);return J({ok:true,removed:true})}
  if(req.method!=='POST')return J({ok:false},405);
  await store.setJSON(id,{endpoint:sub.endpoint,keys:sub.keys,t:Date.now()});
  return J({ok:true});
};
