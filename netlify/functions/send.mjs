import {getStore} from '@netlify/blobs';
import {sendPush} from './webpush.mjs';
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8'}});
const NAME={podo:'포도 시세표',beom:'범 시세표'};
export default async (req)=>{
  const url=new URL(req.url);
  let q=Object.fromEntries(url.searchParams);
  if(req.method==='POST'){try{q={...q,...(await req.json())}}catch(e){}}
  if(!process.env.SEND_SECRET||q.key!==process.env.SEND_SECRET)return J({ok:false,error:'unauthorized'},401);
  const store=getStore('push-subs');
  const {blobs}=await store.list();
  const subs=(await Promise.all(blobs.map(async b=>{const s=await store.get(b.key,{type:'json'});return s?{key:b.key,s,site:s.site||'podo'}:null}))).filter(Boolean);
  if(q.mode==='count'){const c={podo:0,beom:0};subs.forEach(x=>{c[x.site]=(c[x.site]||0)+1});return J({ok:true,subscribers:subs.length,podo:c.podo,beom:c.beom})}
  const target=q.site==='podo'||q.site==='beom'?q.site:'all';
  const list=target==='all'?subs:subs.filter(x=>x.site===target);
  const opt={pub:process.env.VAPID_PUBLIC_KEY,priv:process.env.VAPID_PRIVATE_KEY,contact:process.env.VAPID_CONTACT||'mailto:gordapodo@example.com'};
  let sent=0,removed=0,failed=0;
  await Promise.all(list.map(async x=>{
    const payload={title:q.title||(NAME[x.site]||'시세표')+' 업데이트',body:q.body||'새 시세가 올라왔어요. 지금 확인하세요',url:q.url||'/'};
    try{const st=await sendPush(x.s,payload,opt);
      if(st>=200&&st<300)sent++;else if(st===404||st===410){await store.delete(x.key);removed++}else failed++;
    }catch(e){failed++}
  }));
  return J({ok:true,total:list.length,sent,removed,failed});
};
