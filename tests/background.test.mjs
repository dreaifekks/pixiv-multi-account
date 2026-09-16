import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
const c=id=>({name:'PHPSESSID',value:`${id}_SYNTHETIC`,domain:'.pixiv.net',path:'/',hostOnly:false,secure:true,httpOnly:true,session:true,sameSite:'lax',storeId:'0'});
const KEY='pixivAccountVaultV1',J='pixivSwitchJournalV1';
let counter=0;
async function harness({jar=[c('1')],db={},invalid=[],failSetOnce=false,grantedHosts=manifest.host_permissions}={}){
  let listener,cookieListener,fail=failSetOnce;const events=[];let data=structuredClone(db),cookies=structuredClone(jar);
  const allows=url=>grantedHosts.some(p=>{const [s,h]=p.split('://');const u=new URL(url);return (s==='*'||s+':'===u.protocol)&&h.split('/')[0]===u.hostname;});
  const extensionId='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  globalThis.chrome={
    runtime:{id:extensionId,getURL:p=>`chrome-extension://${extensionId}/${p}`,onMessage:{addListener:f=>listener=f},sendMessage:async m=>{events.push(m.type);}},
    permissions:{contains:async({origins})=>origins.every(o=>o.startsWith('*:')?allows(o.replace('*:','http:'))&&allows(o.replace('*:','https:')):allows(o))},
    storage:{local:{setAccessLevel:async()=>{},get:async k=>({[k]:structuredClone(data[k])}),set:async v=>{Object.assign(data,structuredClone(v));},remove:async k=>{delete data[k];}}},
    cookies:{onChanged:{addListener:f=>cookieListener=f},getAll:async()=>structuredClone(cookies.filter(c=>allows(`${c.secure?'https':'http'}://${c.domain.replace(/^\./,'')}/`))),remove:async({name})=>{cookies=cookies.filter(c=>c.name!==name);return {};},set:async d=>{if(fail){fail=false;throw Error('mock partial failure');}const cookie={...d,hostOnly:!d.domain,domain:d.domain||new URL(d.url).hostname,session:!d.expirationDate};delete cookie.url;cookies.push(cookie);return cookie;}},
    tabs:{query:async()=>[{id:7,url:'https://www.pixiv.net/en/',incognito:false}],sendMessage:async(id,m)=>{events.push(m.type);return {ready:true};},reload:async()=>{events.push('reload');},create:async d=>{events.push('login-tab');return {id:8};}}
  };
  globalThis.fetch=async()=>{events.push('fetch');const id=cookies[0]?.value.split('_')[0];return {ok:true,url:'https://www.pixiv.net/en/',text:async()=>`<meta name="global-data" content='${JSON.stringify({userData:invalid.includes(id)?null:{id,name:`User ${id}`}})}'>`};};
  await import(`../background.js?test=${++counter}`);
  return {
    request:(action,id,sender={id:extensionId,url:`chrome-extension://${extensionId}/popup.html`})=>new Promise(resolve=>{const accepted=listener({type:'PIXIV_ACCOUNTS',action,id},sender,resolve);if(!accepted)resolve({rejected:true});}),
    get db(){return data;},get jar(){return cookies;},events,
    login:id=>{cookies=[c(id)];},
    emitCookieChange:async change=>{cookieListener?.(change);await new Promise(r=>setTimeout(r,220));}
  };
}

test('recognize, add and switch accounts without losing either session',async()=>{
  const h=await harness();
  assert.equal((await h.request('SYNC')).data.currentId,'1');
  assert.ok(h.db[KEY].accounts['1']);
  assert.equal((await h.request('ADD')).ok,true);
  assert.equal(h.jar.length,0);
  assert.equal(h.db[KEY].pending.sourceId,'1');
  h.login('2');
  await h.emitCookieChange({cookie:c('2'),removed:false});
  assert.equal(h.db[KEY].pending,null);
  assert.deepEqual(Object.keys(h.db[KEY].accounts),['1','2']);
  const switched=await h.request('SWITCH','1');
  assert.equal(switched.ok,true);
  assert.equal(switched.data.currentId,'1');
  assert.equal(h.jar[0].value,'1_SYNTHETIC');
  assert.ok(h.events.includes('PIXIV_FREEZE'));
  assert.ok(h.events.includes('reload'));
  assert.ok(!JSON.stringify(switched).includes('SYNTHETIC'));
  assert.equal(h.db[J],undefined);
});

test('cancelling account addition restores the original login',async()=>{
  const h=await harness();
  await h.request('ADD');
  const result=await h.request('CANCEL');
  assert.equal(result.ok,true);
  assert.equal(result.data.currentId,'1');
  assert.equal(h.jar[0].value,'1_SYNTHETIC');
  assert.equal(h.db[KEY].pending,null);
});

test('invalid target or failed cookie write restores the original login',async()=>{
  for(const failure of [{invalid:['2']},{failSetOnce:true}]){
    const h=await harness({
      db:{[KEY]:{accounts:{2:{id:'2',name:'B',cookies:[c('2')]}},pending:null}},
      ...failure
    });
    const result=await h.request('SWITCH','2');
    assert.equal(result.ok,false);
    assert.equal(h.jar[0].value,'1_SYNTHETIC');
    assert.equal(h.db[J],undefined);
    assert.ok(!JSON.stringify(result).includes('mock'));
  }
});

test('missing permissions block account changes before touching cookies',async()=>{
  const h=await harness({grantedHosts:['https://www.pixiv.net/*','https://accounts.pixiv.net/*']});
  assert.equal((await h.request('LIST')).data.current.status,'permission_required');
  assert.equal((await h.request('ADD')).ok,false);
  assert.equal(h.jar[0].value,'1_SYNTHETIC');
  assert.ok(!h.events.includes('login-tab'));
});

test('only trusted non-incognito pages can access accounts',async()=>{
  const h=await harness();const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.deepEqual(await h.request('LIST',null,{id,url:'https://evil.example/'}),{rejected:true});
  assert.deepEqual(await h.request('LIST',null,{id,url:'https://www.pixiv.net/',tab:{incognito:true}}),{rejected:true});
  assert.equal((await h.request('LIST',null,{id,url:'https://www.pixiv.net/',tab:{incognito:false}})).ok,true);
});
