(() => {
  // Chinese source strings also identify curated errors from older workers.
  // Account names and IDs are user data and are never translated.
  const messages = {
    'Pixiv 账号切换': ['Pixiv アカウント切り替え', 'Pixiv Account Switcher'],
    '登录后自动记住账号。': ['ログインするとアカウントが自動で保存されます。', 'Accounts are saved automatically after login.'],
    '切换账号': ['アカウントを切り替え', 'Switch accounts'],
    '刷新': ['更新', 'Refresh'],
    '重试': ['再試行', 'Retry'],
    '当前账号': ['現在のアカウント', 'Current account'],
    '切换到此账号': ['このアカウントに切り替え', 'Switch to this account'],
    '当前': ['現在', 'Current'],
    '需重新登录': ['再ログインが必要', 'Log in again'],
    '切换': ['切り替え', 'Switch'],
    '＋ 添加账号': ['＋ アカウントを追加', '＋ Add account'],
    '返回原账号': ['元のアカウントに戻る', 'Return to previous account'],
    '正在读取账号…': ['アカウントを読み込み中…', 'Loading account…'],
    '正在切换…': ['切り替え中…', 'Switching…'],
    '正在打开…': ['開いています…', 'Opening…'],
    '正在刷新…': ['再読み込み中…', 'Reloading…'],
    '请在打开的页面登录。': ['開いたページでログインしてください。', 'Log in on the page that opened.'],
    '登录后会自动出现在这里。': ['ログインするとここに自動で表示されます。', 'Your account will appear here after login.'],
    '请重新加载扩展并允许 Pixiv 访问。': ['拡張機能を再読み込みし、Pixiv へのアクセスを許可してください。', 'Reload the extension and allow access to Pixiv.'],
    '暂时无法读取账号，点击刷新重试。': ['アカウントを読み込めません。「更新」で再試行してください。', 'Unable to load the account. Click Refresh to retry.'],
    '正在切换 Pixiv 账号，请稍候…': ['Pixiv アカウントを切り替えています。しばらくお待ちください…', 'Switching Pixiv accounts. Please wait…'],
    '扩展连接已断开，请刷新 Pixiv 页面后重试。': ['拡張機能との接続が切れました。Pixiv のページを再読み込みしてください。', 'The extension was disconnected. Reload the Pixiv page and try again.'],
    '扩展未响应，请刷新页面。': ['拡張機能が応答しません。ページを再読み込みしてください。', 'The extension did not respond. Reload the page.'],
    '无法清除旧登录状态，已停止切换。': ['以前のログイン状態を削除できないため、切り替えを中止しました。', 'Could not clear the previous session. Switching was stopped.'],
    '无法恢复登录状态。': ['ログイン状態を復元できません。', 'Could not restore the session.'],
    '登录状态写入不完整。': ['ログイン状態の書き込みが完了していません。', 'The session was not fully written.'],
    '未读取到 Pixiv 主站会话，请先在 Pixiv 登录。': ['Pixiv のセッションが見つかりません。先に Pixiv にログインしてください。', 'No Pixiv session was found. Log in to Pixiv first.'],
    '已读取会话，但无法连接 Pixiv 核验身份。请检查网络后重试。': ['セッションは読み込めましたが、Pixiv に接続して本人確認ができません。ネットワークを確認して再試行してください。', 'The session was read, but Pixiv could not be reached to verify it. Check your connection and retry.'],
    '已读取会话，但 Pixiv 未通过登录校验，请重新登录或稍后重试。': ['セッションは読み込めましたが、Pixiv のログイン確認に失敗しました。再ログインするか、後でもう一度お試しください。', 'The session was read, but Pixiv did not verify the login. Log in again or retry later.'],
    '已读取会话，但无法从 Pixiv 响应确认登录身份。登录可能已失效，或页面结构已变化。': ['セッションは読み込めましたが、Pixiv の応答からアカウントを確認できません。セッションの期限切れか、ページ構造の変更が考えられます。', 'The session was read, but the account could not be confirmed from Pixiv’s response. The session may have expired or the page structure may have changed.'],
    'Pixiv 返回的账号与会话不一致，已停止操作。': ['Pixiv が返したアカウントとセッションが一致しないため、操作を中止しました。', 'The account returned by Pixiv does not match the session. The operation was stopped.'],
    '校验期间登录状态发生变化，请重试。': ['確認中にログイン状態が変わりました。再試行してください。', 'The session changed during verification. Try again.'],
    '登录身份核验失败，请稍后重试。': ['アカウントの確認に失敗しました。後でもう一度お試しください。', 'Account verification failed. Try again later.'],
    '请先刷新所有已打开的 Pixiv 页面，再切换账号。': ['開いているすべての Pixiv ページを再読み込みしてから、アカウントを切り替えてください。', 'Reload all open Pixiv pages before switching accounts.'],
    'Pixiv Cookie 权限不完整。请在 chrome://extensions 重新加载扩展，并允许 Pixiv 站点访问。': ['Pixiv の Cookie 権限が不足しています。chrome://extensions で拡張機能を再読み込みし、Pixiv へのアクセスを許可してください。', 'Pixiv cookie permissions are incomplete. Reload the extension at chrome://extensions and allow access to Pixiv.'],
    '请先完成添加，或返回原账号。': ['アカウントの追加を完了するか、元のアカウントに戻ってください。', 'Finish adding the account or return to the previous account first.'],
    '未找到该账号。': ['アカウントが見つかりません。', 'Account not found.'],
    '已有待完成的登录，请先完成或返回。': ['ログインが未完了です。完了するか、元に戻ってください。', 'A login is already in progress. Finish it or go back first.'],
    '不支持的操作。': ['対応していない操作です。', 'Unsupported operation.'],
    '浏览器操作失败，请刷新 Pixiv 后重试。': ['ブラウザーの操作に失敗しました。Pixiv を再読み込みして再試行してください。', 'The browser operation failed. Reload Pixiv and try again.'],
    '不支持的 Cookie 范围。': ['対応していない Cookie の範囲です。', 'Unsupported cookie scope.'],
    '该登录状态已过期，请重新登录。': ['ログイン状態の有効期限が切れています。再ログインしてください。', 'This session has expired. Log in again.'],
    '登录身份校验失败，目标账号可能需要重新登录。': ['アカウントの確認に失敗しました。切り替え先のアカウントで再ログインが必要な可能性があります。', 'Account verification failed. The target account may need to log in again.'],
    '切换失败且自动恢复未完成。请打开扩展重试恢复，暂时不要在 Pixiv 操作。': ['切り替えに失敗し、自動復元も完了していません。拡張機能を開いて復元を再試行し、それまでは Pixiv で操作しないでください。', 'Switching failed and automatic recovery did not finish. Open the extension to retry recovery. Avoid using Pixiv until then.']
  };
  function normalize(value) {
    const base = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
    return ['zh', 'ja', 'en'].includes(base) ? base : null;
  }
  function fromURL(url) {
    try {
      const segment = new URL(url).pathname.split('/')[1];
      return /^(?:zh|ja|en|ko)(?:[-_][a-z]+)*$/i.test(segment) ? segment : '';
    } catch { return ''; }
  }
  function detect({lang = '', url = '', languages = []} = {}) {
    // A declared but unsupported site language uses English, not the browser's
    // unrelated preference. An unprefixed URL does not imply Japanese.
    const siteLanguage = lang.trim() || fromURL(url);
    if (siteLanguage) return normalize(siteLanguage) || 'en';
    return languages.map(normalize).find(Boolean) || 'en';
  }
  const browserLanguages = () => globalThis.navigator?.languages || [globalThis.navigator?.language];
  const pageLanguage = () => detect({lang: document.documentElement.lang, url: location.href, languages: browserLanguages()});
  let language = pageLanguage();
  const listeners = new Set();
  function setLanguage(value) {
    const next = normalize(value) || 'en';
    if (next === language) return;
    language = next;
    for (const listener of listeners) listener(language);
  }
  function t(source) {
    return language === 'zh' ? source : messages[source]?.[language === 'ja' ? 0 : 1] ?? source;
  }
  globalThis.PixivAccountI18n = {
    normalize, fromURL, detect, browserLanguages, pageLanguage, setLanguage, t,
    get language() { return language; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    syncPageLanguage() { setLanguage(pageLanguage()); }
  };
})();
