(() => {
  const CSS = `
    :host{display:block;color:inherit;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color-scheme:light dark}
    *{box-sizing:border-box}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid #0096fa;outline-offset:2px}
    .box{width:var(--pixiv-inline-width,auto);margin-left:var(--pixiv-inline-offset,0px);padding:16px var(--pixiv-inline-inset-right,0px) 16px var(--pixiv-inline-inset-left,0px);border-top:1px solid color-mix(in srgb,currentColor 12%,transparent);border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}
    .heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
    strong{font-size:14px;font-weight:650}
    .accounts{max-height:228px;overflow:auto;scrollbar-width:thin}.account{border:0;background:transparent;display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 8px;border-radius:10px;min-height:54px}
    .account:hover,.secondary:hover{background:color-mix(in srgb,currentColor 7%,transparent)}
    .account.current{background:rgba(0,150,250,.09)}.avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;background:#1c719a;color:white;display:grid;place-items:center;font-size:16px;font-weight:600}
    .info{min-width:0;flex:1}.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.id{font-size:11px;opacity:.55}.badge{font-size:11px;color:#0096fa;flex:none}.expired{color:#cf8c24}
    .actions{display:flex;flex-direction:column;gap:6px;margin-top:10px}.primary,.secondary{border:0;border-radius:9px;padding:9px 12px;text-align:center;min-height:38px}.primary{background:#0096fa;color:white;font-weight:600}.primary:hover{background:#0086e0}.secondary{background:color-mix(in srgb,currentColor 5%,transparent)}
    .status{font-size:12px;margin-top:9px;white-space:pre-wrap;line-height:1.7}.status:empty{display:none}.status.error{color:light-dark(#a42626,#ffacac)}
    button:disabled{opacity:.5;cursor:wait}.empty{font-size:12px;opacity:.7;padding:5px 0 9px}.tools{display:flex;gap:8px;align-items:center}.refresh{border:0;background:none;font-size:12px;color:#0096fa;padding:2px}
  `;
  const panels=new Set();
  function refreshPanels(){for(const panel of panels){if(!panel.host.isConnected)panels.delete(panel);else panel.refresh();}}
  chrome.runtime.onMessage.addListener(message=>{if(message?.type==='PIXIV_SESSION_CHANGED')refreshPanels();});
  window.addEventListener('focus',refreshPanels);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPanels();});
  function element(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  class AccountPanel {
    constructor(host, send, options = {}) {
      this.host = host; this.send = send; this.options = options; this.busy = false;
      this.root = host.attachShadow({mode:'open'});
      const style = element('style'); style.textContent = CSS; this.root.append(style);
      this.box = element('section','box'); this.box.setAttribute('aria-label','Pixiv 账号切换'); this.root.append(this.box);
      for(const panel of panels)if(!panel.host.isConnected)panels.delete(panel);
      panels.add(this);
      this.refresh();
    }
    async refresh(force=false) {
      if(this.busy||this.refreshing){this.refreshPending=true;return;}
      this.refreshing=true;
      let refreshError=null;
      try {
        this.state=await this.send('LIST');this.render();
        if(this.state.current?.status==='detected'||(force&&this.state.current?.hasSession)){
          this.status('正在读取账号…');
          this.state=await this.send('CHECK');this.render();
        }
      }
      catch(e) { refreshError=e.message;if(!this.state){this.box.replaceChildren(element('p','status error',e.message)); const b=this.button('重试','secondary',()=>this.refresh()); this.box.append(b);} }
      finally {
        this.refreshing=false;
        // Apply the current permission/pending state, instead of blindly enabling
        // buttons after an error or a delayed verification response.
        if(this.state){this.render();if(refreshError)this.status(refreshError,true);}
        if(this.refreshPending){this.refreshPending=false;queueMicrotask(()=>this.refresh());}
      }
    }
    button(text, cls, handler) { const b = element('button',cls,text); b.type='button'; b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(e.isTrusted)handler();}); return b; }
    status(message, error=false) { this.message.textContent = message; this.message.className = `status${error?' error':''}`; }
    async act(action, id) {
      if (this.busy||this.refreshing) return;
      this.busy = true;
      for(const b of this.root.querySelectorAll('button')) b.disabled = true;
      this.status(action==='SWITCH'?'正在切换…':'正在打开…');
      try {
        this.state = await this.send(action,id); this.busy=false; this.render();
        this.status(({ADD:'请在打开的页面登录。',CANCEL:'',SWITCH:'正在刷新…'})[action]||'');
      } catch(e) {
        this.busy=false;this.render();
        this.status(e.message,true);
      }
      finally{if(this.refreshPending){this.refreshPending=false;queueMicrotask(()=>this.refresh());}}
    }
    render() {
      const s=this.state;this.box.replaceChildren();
      const heading=element('div','heading');heading.append(element('strong','', '切换账号'));
      heading.append(this.button('刷新','refresh',()=>this.refresh(true)));this.box.append(heading);
      const live=s.current||{status:'detected',hasSession:!!s.currentId,id:s.currentId};
      const verified=live.status==='verified';
      const accessMissing=live.status==='permission_required';
      if(accessMissing)this.box.append(element('p','empty','请重新加载扩展并允许 Pixiv 访问。'));
      else if(live.status==='unverified')this.box.append(element('p','empty','暂时无法读取账号，点击刷新重试。'));
      const list=element('div','accounts');
      for(const a of s.accounts) {
        const current=verified&&a.id===live.id;
        const row=this.button('','account'+(current?' current':''),()=>this.act('SWITCH',a.id));row.setAttribute('aria-label',`${a.name}，${current?'当前账号':'切换到此账号'}`);row.setAttribute('aria-current',String(current));
        let av=element('span','avatar',a.name.slice(0,1));
        if(a.avatar){const img=element('img','avatar');img.src=a.avatar;img.alt='';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.replaceWith(av),{once:true});row.append(img);}else row.append(av);
        const info=element('div','info');info.append(element('div','name',a.name),element('div','id',`ID ${a.id}`));row.append(info);
        row.append(element('span','badge'+(a.expired?' expired':''),current?'当前':a.expired?'需重新登录':'切换'));
        if(s.pending||accessMissing)row.disabled=true;list.append(row);
      }
      if(!s.accounts.length)list.append(element('p','empty',live.hasSession?'正在读取账号…':'登录后会自动出现在这里。'));
      this.box.append(list);this.actions=element('div','actions');
      if(s.pending){
        this.actions.append(this.button('返回原账号','secondary',()=>this.act('CANCEL')));
      }else{
        const add=this.button('＋ 添加账号','primary',()=>this.act('ADD'));
        add.disabled=accessMissing||(live.hasSession&&!verified);this.actions.append(add);
      }
      this.box.append(this.actions);
      this.message=element('div','status');this.message.setAttribute('role','status');this.message.setAttribute('aria-live','polite');this.box.append(this.message);
      if(this.refreshing||this.busy)for(const b of this.root.querySelectorAll('button'))b.disabled=true;
      if(accessMissing)for(const b of this.actions.querySelectorAll('button'))b.disabled=true;
    }
  }
  globalThis.PixivAccountPanel=AccountPanel;
  globalThis.pixivAccountSend=async(action,id)=>{
    let response;
    try{response=await chrome.runtime.sendMessage({type:'PIXIV_ACCOUNTS',action,id});}
    catch{throw new Error('扩展连接已断开，请刷新 Pixiv 页面后重试。');}
    if(!response?.ok)throw new Error(response?.error||'扩展未响应，请刷新页面。');
    return response.data;
  };
})();
