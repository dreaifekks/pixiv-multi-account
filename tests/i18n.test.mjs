import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../i18n.js',import.meta.url),'utf8');
const popupSource=await readFile(new URL('../popup.js',import.meta.url),'utf8');
function harness({lang='',url='https://www.pixiv.net/',languages=['en-US']}={}) {
  const elements={title:{},description:{},panel:{}};
  const context=vm.createContext({URL,navigator:{languages},location:{href:url},
    document:{documentElement:{lang},getElementById:id=>elements[id]}});
  vm.runInContext(source,context);
  return {context,i18n:context.PixivAccountI18n,elements};
}

test('site language takes priority over URL and browser, including regional variants',()=>{
  const {i18n}=harness();
  for(const [lang,expected] of [['ja','ja'],['en-GB','en'],['zh-TW','zh'],['zh-Hant','zh'],['ZH_cn','zh']]){
    assert.equal(i18n.detect({lang,url:'https://www.pixiv.net/en/',languages:['ja']}),expected);
  }
  assert.equal(i18n.detect({lang:'ko',url:'https://www.pixiv.net/en/',languages:['zh']}),'en');
});

test('missing page language falls back to URL then supported browser language',()=>{
  const {i18n}=harness();
  for(const [path,expected] of [['en/artworks/123','en'],['ja/','ja'],['zh-tw/','zh']]){
    assert.equal(i18n.detect({url:`https://www.pixiv.net/${path}`,languages:['ja']}),expected);
  }
  assert.equal(i18n.detect({url:'https://www.pixiv.net/artworks/123',languages:['fr','zh-CN']}),'zh');
  assert.equal(i18n.detect({url:'https://www.pixiv.net/',languages:['ja']}),'ja');
  assert.equal(i18n.detect({url:'invalid',languages:['fr']}),'en');
});

test('page sync notifies only on a language change and translates curated errors',()=>{
  const {context,i18n}=harness({lang:'zh-CN'});
  let updates=0;const unsubscribe=i18n.subscribe(()=>updates++);
  context.document.documentElement.lang='ja';i18n.syncPageLanguage();
  assert.equal(i18n.t('切换账号'),'アカウントを切り替え');
  assert.equal(i18n.t('未找到该账号。'),'アカウントが見つかりません。');
  i18n.syncPageLanguage();assert.equal(updates,1);
  context.document.documentElement.lang='en';i18n.syncPageLanguage();
  assert.equal(i18n.t('切换账号'),'Switch accounts');
  assert.equal(i18n.t('该登录状态已过期，请重新登录。'),'This session has expired. Log in again.');
  assert.equal(updates,2);unsubscribe();
  i18n.setLanguage('zh');assert.equal(updates,2);
  assert.equal(i18n.t('切换账号'),'切换账号');
  assert.equal(i18n.t('Unknown diagnostic'),'Unknown diagnostic');
});

async function popup({url,reply,fail=false,languages=['en']}={}){
  const h=harness({url:'chrome-extension://test/popup.html',languages});
  let requests=0,panels=0;
  h.context.chrome={tabs:{query:async()=>[{id:7,url}],sendMessage:async(id,message,options)=>{
    requests++;assert.equal(id,7);assert.equal(message.type,'PIXIV_GET_LANGUAGE');assert.equal(options.frameId,0);
    if(fail)throw Error('No content script');return reply;
  }}};
  h.context.pixivAccountSend=()=>{};
  h.context.PixivAccountPanel=function(){panels++;};
  await vm.runInContext(popupSource,h.context);
  return {...h,requests,panels};
}

test('popup reads active Pixiv page language instead of trusting its URL',async()=>{
  const h=await popup({url:'https://www.pixiv.net/en/',reply:{language:'ja'},languages:['zh']});
  assert.equal(h.i18n.language,'ja');assert.equal(h.requests,1);assert.equal(h.panels,1);
  assert.equal(h.elements.title.textContent,'Pixiv アカウント切り替え');
  assert.equal(h.context.document.documentElement.lang,'ja');
});

test('popup without a content script still opens in the URL language',async()=>{
  const h=await popup({url:'https://www.pixiv.net/en/',fail:true,languages:['zh']});
  assert.equal(h.i18n.language,'en');assert.equal(h.panels,1);
});

test('popup on unrelated or inaccessible tabs uses browser language without messaging them',async()=>{
  for(const url of ['https://example.com/en/',undefined]){
    const h=await popup({url,languages:['ja']});
    assert.equal(h.i18n.language,'ja');assert.equal(h.requests,0);assert.equal(h.panels,1);
  }
});
