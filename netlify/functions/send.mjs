import {getStore} from '@netlify/blobs';
import {sendPush} from './webpush.mjs';
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8'}});
export default async (req)=>{
  const url=new URL(req.url);
  let q=Object.fromEntries(url.searchParams);
  if(req.method==='POST'){try{q={...q,...(await req.json())}}catch(e){}}
  if(!process.env.SEND_SECRET||q.key!==process.env.SEND_SECRET)return J({ok:false,error:'unauthorized'},401);
  const store=getStore('push-subs');
  const {blobs}=await store.list();
  if(q.mode==='count')return J({ok:true,subscribers:blobs.length});
  const payload={title:q.title||'포도 시세표 업데이트',body:q.body||'새 시세가 올라왔어요. 지금 확인하세요',url:q.url||url.origin+'/'};
  const opt={pub:process.env.VAPID_PUBLIC_KEY,priv:process.env.VAPID_PRIVATE_KEY,contact:process.env.VAPID_CONTACT||'mailto:gordapodo@example.com'};
  let sent=0,removed=0,failed=0;
  await Promise.all(blobs.map(async b=>{
    const sub=await store.get(b.key,{type:'json'});
    if(!sub)return;
    try{const s=await sendPush(sub,payload,opt);
      if(s>=200&&s<300)sent++;else if(s===404||s===410){await store.delete(b.key);removed++}else failed++;
    }catch(e){failed++}
  }));
  return J({ok:true,total:blobs.length,sent,removed,failed});
};
