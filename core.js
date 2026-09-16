// Only the established Pixiv web session cookie is managed. Preferences,
// third-party login providers and unrelated subdomain cookies are untouched.
export function managedCookie(c) {
  return c.name === 'PHPSESSID' && !c.partitionKey &&
    ['pixiv.net', '.pixiv.net', 'www.pixiv.net', '.www.pixiv.net',
      'accounts.pixiv.net', '.accounts.pixiv.net'].includes(c.domain);
}

export function cookieURL(c) {
  const host = c.domain.replace(/^\./, '');
  return `https://${host === 'pixiv.net' && !c.hostOnly ? 'www.pixiv.net' : host}${c.path || '/'}`;
}

export function cookieDetails(c, now = Date.now() / 1000) {
  if (!managedCookie(c)) throw new Error('不支持的 Cookie 范围。');
  if (c.expirationDate && c.expirationDate <= now) throw new Error('该登录状态已过期，请重新登录。');
  const d = { url: cookieURL(c), name: c.name, value: c.value,
    path: c.path || '/', secure: c.secure, httpOnly: c.httpOnly,
    sameSite: c.sameSite, storeId: c.storeId };
  if (!c.hostOnly) d.domain = c.domain;
  if (!c.session && c.expirationDate) d.expirationDate = c.expirationDate;
  return d;
}

export function sessionUID(cookies) {
  const ids = new Set(cookies.filter(managedCookie)
    .filter(c => c.domain.replace(/^\./, '') !== 'accounts.pixiv.net')
    .map(c => /^(\d+)_/.exec(c.value)?.[1]).filter(Boolean));
  return ids.size === 1 ? [...ids][0] : null;
}

export function fingerprint(cookies) {
  return JSON.stringify(cookies.map(c => [c.storeId, c.domain, c.path, c.name, c.value]).sort());
}

function entities(s) {
  return s.replace(/&(#x[\da-f]+|#\d+|quot|apos|amp|lt|gt);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ({quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'})[e.toLowerCase()] || m;
  });
}

export function safeUser(u) {
  if (!u || !/^\d+$/.test(String(u.id ?? u.userId ?? ''))) return null;
  const raw = u.profileImg || u.imageBig || u.image || u.profileImageUrl || '';
  let avatar = '';
  try { const a = new URL(raw); if (a.protocol === 'https:' &&
    (a.hostname === 'i.pximg.net' || a.hostname === 's.pximg.net')) avatar = a.href; } catch {}
  return { id: String(u.id ?? u.userId), name: String(u.name || u.userName || `用户 ${u.id ?? u.userId}`).slice(0, 120), avatar };
}

// Never identify the viewer from an artwork author's profile or arbitrary IDs.
// An unknown schema fails closed instead of guessing the authenticated user.
export function parseIdentity(html) {
  for (const m of html.matchAll(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = {};
    for (const a of m[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = entities(a[2] ?? a[3]);
    if (attrs.name === 'global-data' || attrs.id === 'meta-global-data') {
      try { const u = safeUser(JSON.parse(attrs.content).userData); if (u) return u; } catch {}
    }
  }
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bid\s*=\s*["']__NEXT_DATA__["']/.test(m[1])) continue;
    try {
      const data = JSON.parse(m[2]);
      const p = data.props?.pageProps;
      const raw = p?.serverSerializedPreloadedState;
      const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const u = safeUser(state?.userData?.self);
      if (u) return u;
    } catch {}
  }
  return null;
}

export function publicState(vault, uid, current = null) {
  return {
    currentId: uid,
    current,
    accounts: Object.values(vault.accounts || {}).map(a => ({
      id: a.id, name: a.name, avatar: a.avatar, savedAt: a.savedAt,
      expired: a.cookies.some(c => c.expirationDate && c.expirationDate <= Date.now() / 1000)
    })),
    pending: vault.pending ? { sourceId: vault.pending.sourceId } : null
  };
}

export function serialized() {
  let tail = Promise.resolve();
  return fn => { const p = tail.then(fn); tail = p.catch(() => {}); return p; };
}

export async function transactional({ before, after, expectedId, replace, verify, journal, clearJournal }) {
  // The journal is durable before the first mutation. A worker restart restores it.
  await journal(before);
  try {
    await replace(after);
    const identity = await verify();
    if (identity?.id !== expectedId) throw new Error('登录身份校验失败，目标账号可能需要重新登录。');
    await clearJournal();
    return identity;
  } catch (error) {
    try { await replace(before); await clearJournal(); }
    catch { throw new Error('切换失败且自动恢复未完成。请打开扩展重试恢复，暂时不要在 Pixiv 操作。'); }
    throw error;
  }
}
