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

test('page language changes update labels and errors in all four languages',()=>{
  const {context,i18n}=harness();
  for(const [lang,heading,error] of [
    ['zh-CN','切换账号','未找到该账号。'],
    ['zh-TW','切換帳號','找不到此帳號。'],
    ['ja','アカウントを切り替え','アカウントが見つかりません。'],
    ['en','Switch accounts','Account not found.']
  ]){
    context.document.documentElement.lang=lang;i18n.syncPageLanguage();
    assert.equal(i18n.t('切换账号'),heading,lang);
    assert.equal(i18n.t('未找到该账号。'),error,lang);
  }
});

test('language priority is page, URL, then browser, with Chinese script support',()=>{
  const {i18n}=harness();
  for(const [input,expected] of [
    [{lang:'ja',url:'https://www.pixiv.net/en/',languages:['zh-CN']},'ja'],
    [{lang:'zh-Hans-TW'},'zh'],
    [{lang:'zh-Hant-CN'},'zh-Hant'],
    [{url:'https://www.pixiv.net/zh-tw/',languages:['en']},'zh-Hant'],
    [{languages:['zh-HK']},'zh-Hant'],
    [{languages:['ja']},'ja'],
    [{lang:'ko',languages:['zh-CN']},'en']
  ]) assert.equal(i18n.detect(input),expected,JSON.stringify(input));
});

test('popup uses the Pixiv page language and falls back when it cannot read the page',async()=>{
  for(const [url,reply,languages,expected,title] of [
    ['https://www.pixiv.net/en/',{language:'ja'},['zh-CN'],'ja','Pixiv アカウント切り替え'],
    ['https://www.pixiv.net/zh-tw/',null,['en'],'zh-Hant','Pixiv 帳號切換'],
    ['https://example.com/',null,['en'],'en','Pixiv Account Switcher']
  ]){
    const {context,i18n,elements}=harness({url:'chrome-extension://test/popup.html',languages});
    let requests=0,panels=0;
    context.chrome={tabs:{query:async()=>[{id:7,url}],sendMessage:async()=>{
      requests++;
      if(!reply)throw Error('No content script');
      return reply;
    }}};
    context.pixivAccountSend=()=>{};
    context.PixivAccountPanel=function(){panels++;};
    await vm.runInContext(popupSource,context);
    assert.equal(i18n.language,expected);
    assert.equal(context.document.documentElement.lang,expected);
    assert.equal(elements.title.textContent,title);
    assert.equal(panels,1);
    assert.equal(requests,url.includes('www.pixiv.net')?1:0);
  }
});
