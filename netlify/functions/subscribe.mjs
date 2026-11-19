import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
const CORS={'access-control-allow-origin':'*','access-control-allow-methods':'POST,DELETE,OPTIONS','access-control-allow-headers':'content-type'};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json',...CORS}});
export default async (req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  const store=getStore('push-subs');
  let sub;
  try{sub=await req.json()}catch(e){return J({ok:false,error:'bad json'},400)}
  if(!sub||!sub.endpoint||!sub.keys||!sub.keys.p256dh||!sub.keys.auth)return J({ok:false,error:'bad subscription'},400);
  if(!/^https:\/\//.test(sub.endpoint))return J({ok:false,error:'bad endpoint'},400);
  const id=createHash('sha256').update(sub.endpoint).digest('hex').slice(0,40);
  if(req.method==='DELETE'){await store.delete(id);return J({ok:true,removed:true})}
  if(req.method!=='POST')return J({ok:false},405);
  const site=['podo','beom'].includes(sub.site)?sub.site:'podo';
  await store.setJSON(id,{endpoint:sub.endpoint,keys:sub.keys,site,t:Date.now()});
  return J({ok:true});
};
