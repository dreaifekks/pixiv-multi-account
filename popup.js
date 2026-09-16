(async () => {
  const i18n=PixivAccountI18n;
  let language=i18n.detect({languages:i18n.browserLanguages()});
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(tab?.url&&new URL(tab.url).hostname==='www.pixiv.net'){
      language=i18n.detect({url:tab.url,languages:i18n.browserLanguages()});
      // Read the actual site's setting; URL prefixes can be missing or stale.
      try {
        const reply=await chrome.tabs.sendMessage(tab.id,{type:'PIXIV_GET_LANGUAGE'},{frameId:0});
        language=i18n.normalize(reply?.language)||language;
      } catch { /* An older/unloaded content script falls back to the URL. */ }
    }
  } catch { /* Outside Pixiv, use the browser's preferred supported language. */ }
  i18n.setLanguage(language);
  document.documentElement.lang=language;
  document.title=i18n.t('Pixiv 账号切换');
  document.getElementById('title').textContent=document.title;
  document.getElementById('description').textContent=i18n.t('登录后自动记住账号。');
  new PixivAccountPanel(document.getElementById('panel'),pixivAccountSend);
})();
