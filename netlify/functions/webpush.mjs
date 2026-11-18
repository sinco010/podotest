import {createECDH,createPrivateKey,sign,randomBytes,createCipheriv,hkdfSync} from 'node:crypto';
const b64u=b=>Buffer.from(b).toString('base64url');
const fromB64u=s=>Buffer.from(s,'base64url');
export function vapidAuth(endpoint,pub,priv,sub){
  const aud=new URL(endpoint).origin;
  const head=b64u(JSON.stringify({typ:'JWT',alg:'ES256'}));
  const body=b64u(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+12*3600,sub}));
  const p=fromB64u(pub);
  const key=createPrivateKey({key:{kty:'EC',crv:'P-256',x:b64u(p.subarray(1,33)),y:b64u(p.subarray(33,65)),d:priv},format:'jwk'});
  const sig=sign('sha256',Buffer.from(head+'.'+body),{key,dsaEncoding:'ieee-p1363'});
  return 'vapid t='+head+'.'+body+'.'+b64u(sig)+', k='+pub;
}
export function encrypt(sub,payload){
  const ua=fromB64u(sub.keys.p256dh), auth=fromB64u(sub.keys.auth);
  const ecdh=createECDH('prime256v1'); ecdh.generateKeys();
  const asPub=ecdh.getPublicKey();
  const secret=ecdh.computeSecret(ua);
  const keyInfo=Buffer.concat([Buffer.from('WebPush: info\0'),ua,asPub]);
  const ikm=Buffer.from(hkdfSync('sha256',secret,auth,keyInfo,32));
  const salt=randomBytes(16);
  const cek=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16));
  const nonce=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12));
  const c=createCipheriv('aes-128-gcm',cek,nonce);
  const ct=Buffer.concat([c.update(Buffer.concat([Buffer.from(payload),Buffer.from([2])])),c.final(),c.getAuthTag()]);
  const rs=Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt,rs,Buffer.from([asPub.length]),asPub,ct]);
}
export async function sendPush(sub,payload,{pub,priv,contact,ttl=86400,fetchImpl=fetch}){
  const body=encrypt(sub,typeof payload==='string'?payload:JSON.stringify(payload));
  const r=await fetchImpl(sub.endpoint,{method:'POST',headers:{
    'Authorization':vapidAuth(sub.endpoint,pub,priv,contact),
    'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',
    'TTL':String(ttl),'Urgency':'normal'},body});
  return r.status;
}
