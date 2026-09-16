import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
const c=id=>({name:'PHPSESSID',value:`${id}_SYNTHETIC`,domain:'.pixiv.net',path:'/',hostOnly:false,secure:true,httpOnly:true,session:true,sameSite:'lax',storeId:'0'});
const KEY='pixivAccountVaultV1',J='pixivSwitchJournalV1';
let counter=0;
async function harness({jar=[c('1')],db={},invalid=[],failSetOnce=false,freezeReady=true,grantedHosts=manifest.host_permissions,opaqueUser=null,rotateOnFetch=false}={}){
  let listener,cookieListener,fail=failSetOnce;const events=[];let data=structuredClone(db),cookies=structuredClone(jar);
  const allows=url=>grantedHosts.some(p=>{const [s,h]=p.split('://');const u=new URL(url);return (s==='*'||s+':'===u.protocol)&&h.split('/')[0]===u.hostname;});
  const extensionId='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  globalThis.chrome={
    runtime:{id:extensionId,getURL:p=>`chrome-extension://${extensionId}/${p}`,onMessage:{addListener:f=>listener=f},sendMessage:async m=>{events.push(m.type);}},
    permissions:{contains:async({origins})=>origins.every(o=>o.startsWith('*:')?allows(o.replace('*:','http:'))&&allows(o.replace('*:','https:')):allows(o))},
    storage:{local:{setAccessLevel:async()=>{},get:async k=>({[k]:structuredClone(data[k])}),set:async v=>{Object.assign(data,structuredClone(v));},remove:async k=>{delete data[k];}}},
    cookies:{onChanged:{addListener:f=>cookieListener=f},getAll:async()=>structuredClone(cookies.filter(c=>allows(`${c.secure?'https':'http'}://${c.domain.replace(/^\./,'')}/`))),remove:async({name})=>{cookies=cookies.filter(c=>c.name!==name);return {};},set:async d=>{if(fail){fail=false;throw Error('mock partial failure');}const cookie={...d,hostOnly:!d.domain,domain:d.domain||new URL(d.url).hostname,session:!d.expirationDate};delete cookie.url;cookies.push(cookie);return cookie;}},
    tabs:{query:async()=>[{id:7,url:'https://www.pixiv.net/en/',incognito:false}],sendMessage:async(id,m)=>{events.push(m.type);return {ready:freezeReady};},reload:async()=>{events.push('reload');},create:async d=>{events.push('login-tab');return {id:8};}}
  };
  globalThis.fetch=async()=>{events.push('fetch');const id=opaqueUser||cookies[0]?.value.split('_')[0];if(rotateOnFetch&&cookies[0])cookies[0].value=`${id}_SYNTHETIC_ROTATED`;return {ok:true,url:'https://www.pixiv.net/en/',text:async()=>`<meta name="global-data" content='${JSON.stringify({userData:invalid.includes(id)?null:{id,name:`User ${id}`}})}'>`};};
  await import(`../background.js?test=${++counter}`);
  return {
    request:(action,id,sender={id:extensionId,url:`chrome-extension://${extensionId}/popup.html`})=>new Promise(resolve=>{const accepted=listener({type:'PIXIV_ACCOUNTS',action,id},sender,resolve);if(!accepted)resolve({rejected:true});}),
    get db(){return data;},get jar(){return cookies;},events,
    login:id=>{cookies=[c(id)];},
    emitCookieChange:async change=>{cookieListener?.(change);await new Promise(r=>setTimeout(r,220));}
  };
}
test('save, add, complete, and switch preserves both sessions and reloads sibling tabs',async()=>{
  const h=await harness();
  assert.equal((await h.request('SAVE')).ok,true);
  assert.ok(h.db[KEY].accounts['1']);
  assert.equal((await h.request('ADD')).ok,true);assert.equal(h.jar.length,0);assert.equal(h.db[KEY].pending.sourceId,'1');
  h.login('2');assert.equal((await h.request('COMPLETE')).ok,true);
  assert.deepEqual(Object.keys(h.db[KEY].accounts),['1','2']);
  const switched=await h.request('SWITCH','1');assert.equal(switched.ok,true);assert.equal(switched.data.currentId,'1');
  assert.ok(h.events.includes('PIXIV_FREEZE'));assert.ok(h.events.includes('reload'));
  assert.ok(!JSON.stringify(switched).includes('SYNTHETIC'));assert.equal(h.db[J],undefined);
});
test('current session is automatically remembered on recognition without a save action',async()=>{
  const h=await harness();const list=await h.request('LIST');
  assert.equal(list.data.current?.status,'detected');assert.equal(list.data.current.id,'1');assert.equal(list.data.accounts.length,0);
  assert.ok(!h.events.includes('fetch'));
  const check=await h.request('CHECK');assert.equal(check.ok,true);assert.equal(check.data.current.status,'verified');assert.equal(check.data.current.name,'User 1');assert.equal(h.db[KEY]?.accounts['1']?.id,'1');
  assert.ok(!JSON.stringify(check).includes('SYNTHETIC'));
});
test('login cookie event remembers the account with no panel open',async()=>{
  const h=await harness({jar:[]});h.login('2');await h.emitCookieChange({cookie:c('2'),removed:false});
  assert.equal(h.db[KEY]?.accounts['2']?.id,'2');
});
test('adding another account completes automatically after the official login',async()=>{
  const h=await harness();await h.request('ADD');h.login('2');await h.emitCookieChange({cookie:c('2'),removed:false});
  assert.equal(h.db[KEY].pending,null);assert.deepEqual(Object.keys(h.db[KEY].accounts),['1','2']);
  assert.equal((await h.request('SWITCH','1')).data.currentId,'1');
});
test('page startup sync remembers an already signed-in account',async()=>{
  const h=await harness();const r=await h.request('SYNC');assert.equal(r.ok,true);assert.equal(h.db[KEY]?.accounts['1']?.id,'1');
});
test('automatic recognition never records an invalid session or erases prior accounts',async()=>{
  const h=await harness({invalid:['2'],db:{[KEY]:{accounts:{1:{id:'1',name:'One',cookies:[c('1')]}},pending:null}}});
  h.login('2');await h.emitCookieChange({cookie:c('2'),removed:false});assert.deepEqual(Object.keys(h.db[KEY].accounts),['1']);
});
test('current session handles a non-Secure parent-domain cookie',async()=>{
  const h=await harness({jar:[{...c('1'),secure:false}]});assert.equal((await h.request('LIST')).data.currentId,'1');
});
test('cookie event notifies open panels and invalidates previous verification',async()=>{
  const h=await harness();await h.request('CHECK');h.login('2');await h.emitCookieChange({cookie:c('2'),removed:false});
  assert.ok(h.events.includes('PIXIV_SESSION_CHANGED'));const r=await h.request('LIST');assert.equal(r.data.current.status,'verified');assert.equal(r.data.currentId,'2');assert.equal(h.db[KEY].accounts['2'].id,'2');
});
test('expiry-only cookie updates do not cause a verification notification loop',async()=>{
  const h=await harness();await h.request('LIST');await h.request('CHECK');
  await h.emitCookieChange({cookie:{...c('1'),expirationDate:Date.now()/1000+5000},removed:false});
  assert.ok(!h.events.includes('PIXIV_SESSION_CHANGED'));assert.equal((await h.request('LIST')).data.current.status,'verified');
});
test('a revoked live cookie is reported as read but unverified, not silently signed out',async()=>{
  const h=await harness({invalid:['1']});const r=await h.request('CHECK');
  assert.equal(r.data.current.status,'unverified');assert.equal(r.data.current.hasSession,true);assert.equal(r.data.current.reasonCode,'identity_unavailable');assert.equal(h.db[KEY],undefined);
});
test('failed revalidation cannot reuse an earlier successful verification',async()=>{
  const invalid=[];const h=await harness({invalid});await h.request('CHECK');invalid.push('1');
  assert.equal((await h.request('CHECK')).data.current.status,'unverified');
  assert.notEqual((await h.request('LIST')).data.current.status,'verified');
});
test('missing granted parent permission is explicit and blocks add without cookie mutation',async()=>{
  const h=await harness({grantedHosts:['https://www.pixiv.net/*','https://accounts.pixiv.net/*']});
  const list=await h.request('LIST');assert.equal(list.data.current.status,'permission_required');
  assert.equal((await h.request('ADD')).ok,false);assert.equal(h.jar[0].value,'1_SYNTHETIC');assert.ok(!h.events.includes('login-tab'));
});
test('opaque session can be server-verified without treating cookie format as a login requirement',async()=>{
  const h=await harness({jar:[{...c('1'),value:'OPAQUE_SYNTHETIC_TOKEN'}],opaqueUser:'1'});
  const r=await h.request('CHECK');assert.equal(r.ok,true);assert.equal(r.data.current.status,'verified');assert.equal(r.data.current.id,'1');
});
test('same-user cookie rotation during verification is accepted',async()=>{
  const h=await harness({rotateOnFetch:true});const r=await h.request('SAVE');assert.equal(r.ok,true);assert.equal(h.db[KEY].accounts['1'].cookies[0].value,'1_SYNTHETIC_ROTATED');
});
test('expired/revoked target rolls back the actual source cookie',async()=>{
  const h=await harness({db:{[KEY]:{version:1,accounts:{2:{id:'2',name:'B',cookies:[c('2')]}},pending:null}},invalid:['2']});
  const result=await h.request('SWITCH','2');assert.equal(result.ok,false);assert.equal(h.jar[0].value,'1_SYNTHETIC');assert.equal(h.db[J],undefined);
});
test('partial set failure rolls back and does not expose browser error data',async()=>{
  const h=await harness({db:{[KEY]:{accounts:{2:{id:'2',name:'B',cookies:[c('2')]}},pending:null}},failSetOnce:true});
  const result=await h.request('SWITCH','2');assert.equal(result.ok,false);assert.equal(h.jar[0].value,'1_SYNTHETIC');assert.ok(!JSON.stringify(result).includes('mock'));
});
test('cancel adding restores source session without calling the logout endpoint',async()=>{
  const h=await harness();await h.request('ADD');h.login('2');const r=await h.request('CANCEL');assert.equal(r.ok,true);assert.equal(r.data.currentId,'1');assert.equal(h.db[KEY].pending,null);
});
test('worker restart restores durable journal and pending state before accepting an action',async()=>{
  const h=await harness({jar:[],db:{[KEY]:{accounts:{},pending:{sourceId:'1',before:[c('1')]}},[J]:{before:[c('1')],previousPending:null}}});
  const r=await h.request('LIST');assert.equal(r.ok,true);assert.equal(r.data.currentId,'1');assert.equal(r.data.pending,null);assert.equal(h.db[J],undefined);
});
test('missing overlay acknowledgement aborts before touching any login state',async()=>{
  const h=await harness({freezeReady:false});const r=await h.request('ADD');assert.equal(r.ok,false);assert.equal(h.jar[0].value,'1_SYNTHETIC');assert.equal(h.db[J],undefined);
});
test('non-Pixiv senders and incognito cannot operate the vault',async()=>{
  const h=await harness();const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.deepEqual(await h.request('LIST',null,{id,url:'https://evil.example/'}),{rejected:true});
  assert.deepEqual(await h.request('LIST',null,{id,url:'https://www.pixiv.net/',tab:{incognito:true}}),{rejected:true});
  assert.equal((await h.request('LIST',null,{id,url:'https://www.pixiv.net/',tab:{incognito:false}})).ok,true);
});
test('new login can be added from a signed-out browser and cancelled safely',async()=>{
  const h=await harness({jar:[]});assert.equal((await h.request('ADD')).ok,true);h.login('2');assert.equal((await h.request('CANCEL')).ok,true);assert.equal(h.jar.length,0);
});
