import { managedCookie, cookieURL, cookieDetails, sessionUID, fingerprint,
  parseIdentity, publicState, serialized, transactional } from './core.js';

const KEY = 'pixivAccountVaultV1';
const JOURNAL = 'pixivSwitchJournalV1';
const COOKIE_ORIGINS = ['*://pixiv.net/*', '*://www.pixiv.net/*', '*://accounts.pixiv.net/*'];
const run = serialized();
let verifiedCache = null, notificationTimer, lastNotifiedCookieKey;
const init = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const blank = () => ({ version: 1, accounts: {}, pending: null });
async function vault() { return (await chrome.storage.local.get(KEY))[KEY] || blank(); }
async function save(v) { await chrome.storage.local.set({ [KEY]: v }); }
async function hasCookieAccess() { return chrome.permissions.contains({ origins: COOKIE_ORIGINS }); }
const mainCookies = jar => jar.filter(c => c.domain.replace(/^\./, '') !== 'accounts.pixiv.net');
function failure(code, text) { const error = new Error(text); error.code = code; return error; }
async function cookies() {
  const all = await chrome.cookies.getAll({ domain: 'pixiv.net' });
  return all.filter(managedCookie);
}
async function replace(target) {
  verifiedCache = null;
  // Preflight every cookie before removing any existing login.
  const details = target.map(c => cookieDetails(c));
  for (const c of await cookies()) {
    await chrome.cookies.remove({ url: cookieURL(c), name: c.name, storeId: c.storeId });
  }
  if ((await cookies()).length) throw new Error('无法清除旧登录状态，已停止切换。');
  for (const d of details) if (!await chrome.cookies.set(d)) throw new Error('无法恢复登录状态。');
  const actual = await cookies();
  if (fingerprint(actual) !== fingerprint(target)) throw new Error('登录状态写入不完整。');
}
async function identity() {
  verifiedCache = null;
  const before = await cookies();
  const uid = sessionUID(before);
  if (!mainCookies(before).length) throw failure('no_session', '未读取到 Pixiv 主站会话，请先在 Pixiv 登录。');
  let response;
  try {
    response = await fetch(`https://www.pixiv.net/en/?pixiv_account_check=${Date.now()}`, {
      credentials: 'include', cache: 'no-store', redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
  } catch { throw failure('network', '已读取会话，但无法连接 Pixiv 核验身份。请检查网络后重试。'); }
  if (!response.ok || new URL(response.url).hostname !== 'www.pixiv.net')
    throw failure('http', '已读取会话，但 Pixiv 未通过登录校验，请重新登录或稍后重试。');
  const who = parseIdentity(await response.text());
  if (!who) throw failure('identity_unavailable', '已读取会话，但无法从 Pixiv 响应确认登录身份。登录可能已失效，或页面结构已变化。');
  if (uid && who.id !== uid) throw failure('identity_mismatch', 'Pixiv 返回的账号与会话不一致，已停止操作。');
  const after = await cookies();
  if (fingerprint(before) !== fingerprint(after) && !(uid === who.id && sessionUID(after) === who.id))
    throw failure('session_changed', '校验期间登录状态发生变化，请重试。');
  verifiedCache = { key: fingerprint(after), at: Date.now(), current: {
    status: 'verified', hasSession: true, id: who.id, name: who.name, avatar: who.avatar, checkedAt: Date.now()
  } };
  return { ...who, cookies: after, savedAt: Date.now() };
}
async function rememberCurrent(v, account) {
  const old = v.accounts[account.id];
  const completed = !!v.pending;
  if (!old || old.name !== account.name || old.avatar !== account.avatar ||
      JSON.stringify(old.cookies) !== JSON.stringify(account.cookies) || completed) {
    v.accounts[account.id] = { id: account.id, name: account.name, avatar: account.avatar,
      cookies: account.cookies, savedAt: Date.now() };
    v.pending = null;
    await save(v);
  }
  if (completed) await refresh(await pixivTabs());
}
async function currentState(v, verify = false) {
  const jar = await cookies(), key = fingerprint(jar);
  if (lastNotifiedCookieKey === undefined) lastNotifiedCookieKey = key;
  const hint = sessionUID(jar);
  let current = { status: 'absent', hasSession: false, id: null };
  if (mainCookies(jar).length) {
    current = { status: 'detected', hasSession: true, id: hint };
    if (verify) {
      try { await rememberCurrent(v, await identity()); }
      catch (e) {
        const now = await cookies();
        current = { status: mainCookies(now).length ? 'unverified' : 'absent', hasSession: !!mainCookies(now).length,
          id: sessionUID(now), reasonCode: e.code || 'verification_failed',
          reason: e.code ? e.message : '登录身份核验失败，请稍后重试。' };
        return publicState(v, current.id, current);
      }
      return publicState(v, verifiedCache.current.id, verifiedCache.current);
    }
    if (verifiedCache?.key === key && Date.now() - verifiedCache.at < 20000) {
      current = verifiedCache.current;
      await rememberCurrent(v, { ...current, cookies: jar });
    }
  }
  return publicState(v, current.id, current);
}
async function autoRemember() {
  await init;
  if (!await hasCookieAccess() || (await chrome.storage.local.get(JOURNAL))[JOURNAL]) return;
  const v = await vault();
  const state = await currentState(v);
  if (state.current.status === 'detected') await currentState(v, true);
}
async function notifySessionChanged() {
  const key = fingerprint(await cookies());
  if (key === lastNotifiedCookieKey) return;
  lastNotifiedCookieKey = key;
  if (verifiedCache?.key !== key) verifiedCache = null;
  await autoRemember();
  const message = { type: 'PIXIV_SESSION_CHANGED' };
  await Promise.allSettled([
    chrome.runtime.sendMessage(message),
    ...(await pixivTabs()).filter(t => new URL(t.url).hostname === 'www.pixiv.net').map(t => chrome.tabs.sendMessage(t.id, message))
  ]);
}
chrome.cookies.onChanged.addListener(change => {
  if (!managedCookie(change.cookie) || change.cookie.storeId !== '0') return;
  clearTimeout(notificationTimer);
  // Queue notifications behind in-progress switches; intermediate cookie removals
  // must not cause the UI to save an empty or half-restored snapshot.
  notificationTimer = setTimeout(() => { run(notifySessionChanged).catch(() => {}); }, 120);
});
async function pixivTabs() {
  return (await chrome.tabs.query({ url: ['https://www.pixiv.net/*', 'https://accounts.pixiv.net/*'] }))
    .filter(t => !t.incognito);
}
async function freeze() {
  const tabs = await pixivTabs();
  // Acknowledge the overlay before swapping shared cookies. Older tabs without
  // the content script must be refreshed once after installing the extension.
  for (const t of tabs.filter(t => new URL(t.url).hostname === 'www.pixiv.net')) {
    try {
      const reply = await chrome.tabs.sendMessage(t.id, { type: 'PIXIV_FREEZE' });
      if (!reply?.ready) throw new Error();
    } catch {
      await thaw();
      throw new Error('请先刷新所有已打开的 Pixiv 页面，再切换账号。');
    }
  }
  return tabs;
}
async function thaw() {
  await Promise.allSettled((await pixivTabs()).map(t => chrome.tabs.sendMessage(t.id, { type: 'PIXIV_THAW' })));
}
async function refresh(tabs) {
  await Promise.allSettled(tabs.filter(t => new URL(t.url).hostname === 'www.pixiv.net').map(t => chrome.tabs.reload(t.id)));
}
async function finish(tabs) {
  // A failed rollback keeps the overlay in place until durable recovery succeeds.
  if ((await chrome.storage.local.get(JOURNAL))[JOURNAL]) return;
  await refresh(tabs); await thaw();
}
async function recover() {
  const j = (await chrome.storage.local.get(JOURNAL))[JOURNAL];
  if (!j) return;
  await replace(j.before);
  if (Object.hasOwn(j, 'previousPending')) {
    const v = await vault(); v.pending = j.previousPending; await save(v);
  }
  await chrome.storage.local.remove(JOURNAL);
  await refresh(await pixivTabs());
}
async function transact(before, after, expectedId) {
  return transactional({ before, after, expectedId, replace, verify: identity,
    journal: b => chrome.storage.local.set({ [JOURNAL]: { before: b, at: Date.now() } }),
    clearJournal: () => chrome.storage.local.remove(JOURNAL) });
}

async function handle(message) {
  await init;
  if (!await hasCookieAccess()) {
    verifiedCache = null;
    const current = { status: 'permission_required', hasSession: null, id: null,
      reason: 'Pixiv Cookie 权限不完整。请在 chrome://extensions 重新加载扩展，并允许 Pixiv 站点访问。' };
    if (['LIST', 'CHECK', 'SYNC'].includes(message.action)) return publicState(await vault(), null, current);
    throw new Error(current.reason);
  }
  await recover();
  const v = await vault();
  if (message.action === 'LIST' || message.action === 'CHECK') return currentState(v, message.action === 'CHECK');
  if (message.action === 'SYNC') {
    const state = await currentState(v);
    return state.current.status === 'detected' ? currentState(v, true) : state;
  }
  // Compatibility for a pre-update tab; the current UI has no manual save step.
  if (message.action === 'SAVE' || message.action === 'COMPLETE') return currentState(v, true);
  if (message.action === 'SWITCH') {
    if (v.pending) throw new Error('请先完成添加，或返回原账号。');
    const target = v.accounts[message.id];
    if (!target) throw new Error('未找到该账号。');
    target.cookies.forEach(c => cookieDetails(c));
    const before = await cookies();
    if (sessionUID(before) === target.id) {
      const current = await identity(); v.accounts[current.id] = current; await save(v);
      return currentState(v);
    }
    // Refresh the saved source only after server-side identity verification.
    if (mainCookies(before).length) {
      try { const a = await identity(); v.accounts[a.id] = a; await save(v); }
      catch { /* Keep its previous verified snapshot; rollback still uses before. */ }
    }
    const tabs = await freeze();
    try {
      const actual = await transact(before, target.cookies, target.id);
      v.accounts[actual.id] = actual; await save(v);
    } finally { await finish(tabs); }
  } else if (message.action === 'ADD') {
    if (v.pending) throw new Error('已有待完成的登录，请先完成或返回。');
    const before = await cookies();
    let sourceId = null;
    if (mainCookies(before).length) {
      const current = await identity(); sourceId = current.id;
      v.accounts[current.id] = current;
    }
    const tabs = await freeze();
    try {
      await chrome.storage.local.set({ [JOURNAL]: { before, previousPending: null, at: Date.now() } });
      v.pending = { sourceId, before }; await save(v);
      await replace([]);
      await chrome.tabs.create({ url: 'https://accounts.pixiv.net/login?return_to=https%3A%2F%2Fwww.pixiv.net%2F' });
      await chrome.storage.local.remove(JOURNAL);
    } catch (error) {
      await replace(before); v.pending = null; await save(v);
      await chrome.storage.local.remove(JOURNAL); throw error;
    } finally { await finish(tabs); }
  } else if (message.action === 'CANCEL') {
    if (!v.pending) return currentState(v);
    const before = await cookies();
    const tabs = await freeze();
    try {
      if (v.pending.sourceId) await transact(before, v.pending.before, v.pending.sourceId);
      else {
        await chrome.storage.local.set({ [JOURNAL]: { before, at: Date.now() } });
        await replace(v.pending.before); await chrome.storage.local.remove(JOURNAL);
      }
      v.pending = null; await save(v);
    } finally { await finish(tabs); }
  } else throw new Error('不支持的操作。');
  return currentState(v);
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'PIXIV_ACCOUNTS') return;
  let url; try { url = new URL(sender.url); } catch { return; }
  const extensionPage = url.protocol === 'chrome-extension:' && url.hostname === chrome.runtime.id;
  if (sender.id !== chrome.runtime.id || sender.tab?.incognito ||
      !(extensionPage || url.origin === 'https://www.pixiv.net')) return;
  run(() => handle(message)).then(data => respond({ ok: true, data }), error => {
    // Never log cookies or raw network bodies. Only curated errors reach the UI.
    const text = error instanceof Error && /[\u3400-\u9fff]/.test(error.message)
      ? error.message : '浏览器操作失败，请刷新 Pixiv 后重试。';
    respond({ ok: false, error: text });
  });
  return true;
});
