import test from 'node:test';
import assert from 'node:assert/strict';
import { managedCookie, cookieDetails, sessionUID, parseIdentity, publicState, serialized, transactional } from '../core.js';
const cookie=(id,extra={})=>({ name:'PHPSESSID',value:`${id}_SYNTHETIC_TEST_ONLY`,domain:'.pixiv.net',path:'/',storeId:'0',secure:true,httpOnly:true,hostOnly:false,session:true,sameSite:'lax',...extra });
test('scope excludes other services, cookie names and partitioned cookies',()=>{
  assert.ok(managedCookie(cookie('1')));
  for(const extra of [{domain:'.evilpixiv.net'},{domain:'sketch.pixiv.net'},{name:'preferences'},{partitionKey:{topLevelSite:'https://www.pixiv.net'}}])assert.equal(managedCookie(cookie('1',extra)),false);
});
test('cookie restoration retains security flags, scope and session lifetime',()=>{
  const c=cookieDetails(cookie('1'));assert.equal(c.httpOnly,true);assert.equal(c.secure,true);assert.equal(c.domain,'.pixiv.net');assert.equal(c.url,'https://www.pixiv.net/');assert.equal(c.expirationDate,undefined);
  assert.equal(cookieDetails(cookie('1',{hostOnly:true,domain:'www.pixiv.net'})).domain,undefined);
  assert.equal(cookieDetails(cookie('1',{hostOnly:true,domain:'pixiv.net'})).url,'https://pixiv.net/');
  assert.throws(()=>cookieDetails(cookie('1',{session:false,expirationDate:1})),/过期/);
});
test('ambiguous session identities never resolve to an arbitrary account',()=>{
  assert.equal(sessionUID([cookie('1'),cookie('2')]),null);
  assert.equal(sessionUID([cookie('1'),cookie('2',{domain:'accounts.pixiv.net'})]),'1');
});
test('legacy identity parser handles attribute order and encoded names',()=>{
  const html=`<meta content='{"userData":{"id":"42","name":"A &amp; B","profileImg":"https://i.pximg.net/avatar.png"}}' id="meta-global-data" name="global-data">`;
  assert.deepEqual(parseIdentity(html),{id:'42',name:'A & B',avatar:'https://i.pximg.net/avatar.png'});
});
test('next identity parser only accepts explicit self profile',()=>{
  const next=JSON.stringify({props:{pageProps:{serverSerializedPreloadedState:JSON.stringify({userData:{self:{id:'99',name:'Self'}},illust:{userId:'10',name:'Author'}})}}});
  assert.equal(parseIdentity(`<script id="__NEXT_DATA__" type="application/json">${next}</script>`).id,'99');
  assert.equal(parseIdentity('<script>{"user":{"id":"99","name":"Someone"}}</script>'),null);
  assert.equal(parseIdentity('<meta name="global-data" content=\'{"userData":null}\'>'),null);
});
test('untrusted profile URLs and markup cannot become executable UI',()=>{
  const u=parseIdentity('<meta name="global-data" content=\'{"userData":{"id":"1","name":"<img onerror=evil>","profileImg":"javascript:evil"}}\'>');
  assert.equal(u.avatar,'');assert.equal(u.name,'<img onerror=evil>');
});
test('public UI projection never includes cookies or pending rollback snapshots',()=>{
  const data=publicState({accounts:{1:{id:'1',name:'A',avatar:'',cookies:[cookie('1')]}},pending:{sourceId:'1',before:[cookie('1')]}},'1');
  assert.ok(!JSON.stringify(data).includes('SYNTHETIC'));assert.ok(!JSON.stringify(data).includes('before'));
});
test('queue serializes overlapping operations and survives rejection',async()=>{
  const q=serialized(),order=[];
  const a=q(async()=>{order.push(1);await new Promise(r=>setTimeout(r,10));order.push(2);throw Error('test');});
  const b=q(async()=>{order.push(3);});await Promise.allSettled([a,b]);assert.deepEqual(order,[1,2,3]);
});
test('successful switch journals before mutation and checks server identity',async()=>{
  const events=[];
  await transactional({before:['A'],after:['B'],expectedId:'2',journal:async()=>events.push('journal'),replace:async v=>events.push(v[0]),verify:async()=>({id:'2'}),clearJournal:async()=>events.push('clear')});
  assert.deepEqual(events,['journal','B','clear']);
});
test('wrong target identity restores source without discarding its session',async()=>{
  const events=[];
  await assert.rejects(transactional({before:['A'],after:['B'],expectedId:'2',journal:async()=>{},replace:async v=>events.push(v[0]),verify:async()=>({id:'3'}),clearJournal:async()=>events.push('clear')}),/校验失败/);
  assert.deepEqual(events,['B','A','clear']);
});
test('partial cookie write failure rolls back; rollback failure retains journal',async()=>{
  let cleared=false;
  await assert.rejects(transactional({before:['A'],after:['B'],expectedId:'2',journal:async()=>{},replace:async()=>{throw Error('write');},verify:async()=>({id:'2'}),clearJournal:async()=>{cleared=true;}}),/恢复未完成/);
  assert.equal(cleared,false);
});
