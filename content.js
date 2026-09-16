(() => {
  if(globalThis.__pixivAccountSwitcher)return;
  globalThis.__pixivAccountSwitcher=true;
  let inlineHost, inlinePanel, overlay, timer, lastContainer, layoutFrame;
  const resizeObserver=new ResizeObserver(()=>scheduleLayout());
  const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
  const logoutText=/^(退出登录|登出|退出登錄|ログアウト|Log\s*out|Sign\s*out)$/i;
  const menuText=/(设置|設定|Settings|收藏|ブックマーク|Bookmarks|我的作品|作品管理|Your works|Dashboard|数据分析)/i;
  function menu() {
    const nodes=[...document.querySelectorAll('a,button,[role="menuitem"]')];
    const logout=nodes.find(e=>visible(e)&&(logoutText.test(e.textContent.trim())||/\/(?:logout)(?:\.php)?(?:[/?#]|$)/i.test(e.getAttribute('href')||'')));
    if(!logout)return null;
    let inner=null, surface=null;
    for(let n=logout.parentElement;n&&n!==document.body;n=n.parentElement){
      if(!visible(n))continue;
      const s=getComputedStyle(n);
      const hasItems=menuText.test(n.textContent)&&n.querySelectorAll('a,button,[role="menuitem"]').length>=4;
      if(!inner&&hasItems)inner=n;
      if(!inner)continue;
      // A navigation wrapper can be narrower than the user-info panel. Continue
      // to the actual dropdown surface; do not guess it from a fixed pixel range.
      const rounded=parseFloat(s.borderTopLeftRadius)>0;
      const painted=s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent';
      if(rounded&&(painted||s.boxShadow!=='none'||parseFloat(s.borderLeftWidth)>0))surface=n;
      if(s.position==='absolute'||s.position==='fixed'||n.getAttribute('role')==='dialog'||n.hasAttribute('popover'))return surface||n;
      if(n.tagName==='HEADER'||n.tagName==='MAIN')break;
    }
    return surface||inner;
  }
  function insertionPoint(container) {
    // Semantic links survive Pixiv's generated CSS class changes. Prefer the
    // first management link below the profile block; logout is the safe fallback.
    const links=[...container.querySelectorAll('a,button,[role="menuitem"]')];
    const first=links.find(a=>/^(数据分析|分析|Dashboard|我的作品|作品管理|Your works|投稿した作品|ダッシュボード)$/i.test(a.textContent.trim()))||
      links.find(a=>/\/(dashboard|manage|manage\.php|bookmark\.php)(?:[/?#]|$)/.test(a.getAttribute('href')||''))||
      links.find(a=>logoutText.test(a.textContent.trim()));
    if(!first)return {parent:container,before:container.firstChild};
    // Lift the insertion out of nested navigation wrappers, stopping below the
    // profile block. Nothing owned by Pixiv is moved or resized.
    let branch=first;
    const profileSelector='img,h1,h2,h3,a[href*="/users/"]';
    while(branch.parentElement&&branch.parentElement!==container){
      const parent=branch.parentElement;
      const hasProfileSibling=[...parent.children].some(s=>s!==branch&&!s.hasAttribute('data-pixiv-account-switcher')&&(s.matches(profileSelector)||s.querySelector(profileSelector)));
      if(hasProfileSibling)return {parent,before:branch};
      branch=parent;
    }
    return {parent:container,before:branch};
  }
  function scheduleLayout(){
    cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(syncLayout);
  }
  function syncLayout(){
    const panel=lastContainer;
    if(!panel?.isConnected||!inlineHost?.isConnected||!visible(panel))return;
    const p=panel.getBoundingClientRect(),h=inlineHost.getBoundingClientRect();
    if(!panel.offsetWidth||!inlineHost.offsetWidth)return;
    const panelScale=p.width/panel.offsetWidth,hostScale=h.width/inlineHost.offsetWidth;
    if(!panelScale||!hostScale)return;
    const s=getComputedStyle(panel);
    // Measure the real panel's inner border edges. The host keeps its natural
    // percentage width; only its shadow section bleeds out to the panel edges,
    // so a shrink-to-fit Pixiv panel cannot grow in a ResizeObserver loop.
    const left=p.left+panel.clientLeft*panelScale;
    const profile=panel.querySelector('img,h1,h2,h3,a[href*="/users/"]');
    const profileInset=profile?Math.max(0,(profile.getBoundingClientRect().left-left)/hostScale):0;
    const insetLeft=Math.max(parseFloat(s.paddingLeft)*panelScale/hostScale,profileInset);
    const insetRight=parseFloat(s.paddingRight)*panelScale/hostScale||insetLeft;
    const vars={
      '--pixiv-inline-width':`${panel.clientWidth*panelScale/hostScale}px`,
      '--pixiv-inline-offset':`${(left-h.left)/hostScale}px`,
      '--pixiv-inline-inset-left':`${insetLeft}px`,
      '--pixiv-inline-inset-right':`${insetRight}px`
    };
    for(const [key,value]of Object.entries(vars))if(inlineHost.style.getPropertyValue(key)!==value)inlineHost.style.setProperty(key,value);
  }
  function update() {
    PixivAccountI18n.syncPageLanguage();
    const container=menu();
    if(container){
      if(!inlineHost?.isConnected||!container.contains(inlineHost)){
        inlineHost?.remove();
        inlineHost=document.createElement('div');inlineHost.dataset.pixivAccountSwitcher='';inlineHost.style.cssText='display:block;box-sizing:border-box;contain:inline-size;width:100%;min-width:0;max-width:none;margin:12px 0;padding:0;';
        const where=insertionPoint(container);where.parent.insertBefore(inlineHost,where.before);
        inlinePanel=new PixivAccountPanel(inlineHost,pixivAccountSend);
      }else if(lastContainer!==container){inlinePanel.refresh();}
      lastContainer=container;
      resizeObserver.disconnect();resizeObserver.observe(container);resizeObserver.observe(inlineHost);
      scheduleLayout();
    }else{lastContainer=null;resizeObserver.disconnect();}
  }
  // The page uses only the native user-info panel. If it cannot be recognized,
  // the Chrome toolbar popup remains available; no unrelated 300px page panel.
  window.addEventListener('resize',scheduleLayout,{passive:true});
  function unfreeze(){overlay?.remove();overlay=null;}
  chrome.runtime.onMessage.addListener((m,_sender,respond)=>{
    if(m?.type==='PIXIV_GET_LANGUAGE'){
      respond({language:PixivAccountI18n.pageLanguage()});return;
    }
    if(m?.type==='PIXIV_FREEZE'){
      if(document.querySelector('input:focus,textarea:focus,[contenteditable="true"]:focus')){respond({ready:false});return;}
      unfreeze();overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#111e;color:white;display:grid;place-items:center;font:16px sans-serif;pointer-events:auto;';
      overlay.textContent=PixivAccountI18n.t('正在切换 Pixiv 账号，请稍候…');overlay.lang=PixivAccountI18n.language;document.documentElement.append(overlay);
      document.activeElement?.blur();respond({ready:true});
    }else if(m?.type==='PIXIV_THAW'){unfreeze();respond({ready:true});}
  });
  PixivAccountI18n.subscribe(()=>{
    if(overlay){overlay.textContent=PixivAccountI18n.t('正在切换 Pixiv 账号，请稍候…');overlay.lang=PixivAccountI18n.language;}
  });
  new MutationObserver(()=>PixivAccountI18n.syncPageLanguage()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('popstate',()=>PixivAccountI18n.syncPageLanguage());
  // Coalesce subtree changes; never mutate the observed DOM on every callback.
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(update,180);}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(update,120);},true);
  update();
  // Recognize and remember an existing login even when the menu stays closed.
  pixivAccountSend('SYNC').catch(()=>{});
})();
