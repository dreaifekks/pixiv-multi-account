import test from 'node:test';
import assert from 'node:assert/strict';
import {managedCookie, transactional} from '../core.js';

test('only Pixiv login cookies are managed',()=>{
  const cookie={name:'PHPSESSID',domain:'.pixiv.net'};
  assert.equal(managedCookie(cookie),true);
  for(const extra of [
    {domain:'.evilpixiv.net'}, {domain:'sketch.pixiv.net'}, {name:'preferences'},
    {partitionKey:{topLevelSite:'https://www.pixiv.net'}}
  ]) assert.equal(managedCookie({...cookie,...extra}),false);
});

test('failed rollback keeps the recovery journal for the next attempt',async()=>{
  let cleared=false;
  await assert.rejects(transactional({
    before:['A'],after:['B'],expectedId:'2',
    journal:async()=>{},
    replace:async()=>{throw Error('write');},
    verify:async()=>({id:'2'}),
    clearJournal:async()=>{cleared=true;}
  }),/恢复未完成/);
  assert.equal(cleared,false);
});
