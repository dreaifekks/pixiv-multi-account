(() => {
  // Chinese source strings also identify curated errors from older workers.
  // Account names and IDs are user data and are never translated.
  // Translation order: Japanese, English, Traditional Chinese.
  const messages = {
    'Pixiv 账号切换': ['Pixiv アカウント切り替え', 'Pixiv Account Switcher', "Pixiv 帳號切換"],
    '登录后自动记住账号。': ['ログインするとアカウントが自動で保存されます。', 'Accounts are saved automatically after login.', "登入後自動記住帳號。"],
    '切换账号': ['アカウントを切り替え', 'Switch accounts', "切換帳號"],
    '刷新': ['更新', 'Refresh', "重新整理"],
    '重试': ['再試行', 'Retry', "重試"],
    '当前账号': ['現在のアカウント', 'Current account', "目前的帳號"],
    '切换到此账号': ['このアカウントに切り替え', 'Switch to this account', "切換至此帳號"],
    '当前': ['現在', 'Current', "目前"],
    '需重新登录': ['再ログインが必要', 'Log in again', "需要重新登入"],
    '切换': ['切り替え', 'Switch', "切換"],
    '＋ 添加账号': ['＋ アカウントを追加', '＋ Add account', "＋ 新增帳號"],
    '返回原账号': ['元のアカウントに戻る', 'Return to previous account', "返回原帳號"],
    '正在读取账号…': ['アカウントを読み込み中…', 'Loading account…', "正在讀取帳號…"],
    '正在切换…': ['切り替え中…', 'Switching…', "正在切換…"],
    '正在打开…': ['開いています…', 'Opening…', "正在開啟…"],
    '正在刷新…': ['再読み込み中…', 'Reloading…', "正在重新整理…"],
    '请在打开的页面登录。': ['開いたページでログインしてください。', 'Log in on the page that opened.', "請在開啟的頁面登入。"],
    '登录后会自动出现在这里。': ['ログインするとここに自動で表示されます。', 'Your account will appear here after login.', "登入後會自動顯示在這裡。"],
    '请重新加载扩展并允许 Pixiv 访问。': ['拡張機能を再読み込みし、Pixiv へのアクセスを許可してください。', 'Reload the extension and allow access to Pixiv.', "請重新載入擴充功能，並允許存取 Pixiv。"],
    '暂时无法读取账号，点击刷新重试。': ['アカウントを読み込めません。「更新」で再試行してください。', 'Unable to load the account. Click Refresh to retry.', "暫時無法讀取帳號，請點選「重新整理」再試一次。"],
    '正在切换 Pixiv 账号，请稍候…': ['Pixiv アカウントを切り替えています。しばらくお待ちください…', 'Switching Pixiv accounts. Please wait…', "正在切換 Pixiv 帳號，請稍候…"],
    '扩展连接已断开，请刷新 Pixiv 页面后重试。': ['拡張機能との接続が切れました。Pixiv のページを再読み込みしてください。', 'The extension was disconnected. Reload the Pixiv page and try again.', "擴充功能連線已中斷，請重新整理 Pixiv 頁面後再試一次。"],
    '扩展未响应，请刷新页面。': ['拡張機能が応答しません。ページを再読み込みしてください。', 'The extension did not respond. Reload the page.', "擴充功能沒有回應，請重新整理頁面。"],
    '无法清除旧登录状态，已停止切换。': ['以前のログイン状態を削除できないため、切り替えを中止しました。', 'Could not clear the previous session. Switching was stopped.', "無法清除原有的登入狀態，已停止切換。"],
    '无法恢复登录状态。': ['ログイン状態を復元できません。', 'Could not restore the session.', "無法還原登入狀態。"],
    '登录状态写入不完整。': ['ログイン状態の書き込みが完了していません。', 'The session was not fully written.', "登入狀態未完整寫入。"],
    '未读取到 Pixiv 主站会话，请先在 Pixiv 登录。': ['Pixiv のセッションが見つかりません。先に Pixiv にログインしてください。', 'No Pixiv session was found. Log in to Pixiv first.', "未讀取到 Pixiv 主站的登入工作階段，請先登入 Pixiv。"],
    '已读取会话，但无法连接 Pixiv 核验身份。请检查网络后重试。': ['セッションは読み込めましたが、Pixiv に接続して本人確認ができません。ネットワークを確認して再試行してください。', 'The session was read, but Pixiv could not be reached to verify it. Check your connection and retry.', "已讀取登入工作階段，但無法連線至 Pixiv 驗證身分。請檢查網路後再試一次。"],
    '已读取会话，但 Pixiv 未通过登录校验，请重新登录或稍后重试。': ['セッションは読み込めましたが、Pixiv のログイン確認に失敗しました。再ログインするか、後でもう一度お試しください。', 'The session was read, but Pixiv did not verify the login. Log in again or retry later.', "已讀取登入工作階段，但未通過 Pixiv 登入驗證，請重新登入或稍後再試。"],
    '已读取会话，但无法从 Pixiv 响应确认登录身份。登录可能已失效，或页面结构已变化。': ['セッションは読み込めましたが、Pixiv の応答からアカウントを確認できません。セッションの期限切れか、ページ構造の変更が考えられます。', 'The session was read, but the account could not be confirmed from Pixiv’s response. The session may have expired or the page structure may have changed.', "已讀取登入工作階段，但無法從 Pixiv 的回應確認登入身分。登入狀態可能已失效，或頁面結構已變更。"],
    'Pixiv 返回的账号与会话不一致，已停止操作。': ['Pixiv が返したアカウントとセッションが一致しないため、操作を中止しました。', 'The account returned by Pixiv does not match the session. The operation was stopped.', "Pixiv 回傳的帳號與登入工作階段不一致，已停止操作。"],
    '校验期间登录状态发生变化，请重试。': ['確認中にログイン状態が変わりました。再試行してください。', 'The session changed during verification. Try again.', "驗證期間登入狀態已變更，請再試一次。"],
    '登录身份核验失败，请稍后重试。': ['アカウントの確認に失敗しました。後でもう一度お試しください。', 'Account verification failed. Try again later.', "登入身分驗證失敗，請稍後再試。"],
    '请先刷新所有已打开的 Pixiv 页面，再切换账号。': ['開いているすべての Pixiv ページを再読み込みしてから、アカウントを切り替えてください。', 'Reload all open Pixiv pages before switching accounts.', "請先重新整理所有已開啟的 Pixiv 頁面，再切換帳號。"],
    'Pixiv Cookie 权限不完整。请在 chrome://extensions 重新加载扩展，并允许 Pixiv 站点访问。': ['Pixiv の Cookie 権限が不足しています。chrome://extensions で拡張機能を再読み込みし、Pixiv へのアクセスを許可してください。', 'Pixiv cookie permissions are incomplete. Reload the extension at chrome://extensions and allow access to Pixiv.', "Pixiv Cookie 權限不完整。請在 chrome://extensions 重新載入擴充功能，並允許存取 Pixiv 網站。"],
    '请先完成添加，或返回原账号。': ['アカウントの追加を完了するか、元のアカウントに戻ってください。', 'Finish adding the account or return to the previous account first.', "請先完成新增帳號，或返回原帳號。"],
    '未找到该账号。': ['アカウントが見つかりません。', 'Account not found.', "找不到此帳號。"],
    '已有待完成的登录，请先完成或返回。': ['ログインが未完了です。完了するか、元に戻ってください。', 'A login is already in progress. Finish it or go back first.', "已有尚未完成的登入，請先完成或返回。"],
    '不支持的操作。': ['対応していない操作です。', 'Unsupported operation.', "不支援此操作。"],
    '浏览器操作失败，请刷新 Pixiv 后重试。': ['ブラウザーの操作に失敗しました。Pixiv を再読み込みして再試行してください。', 'The browser operation failed. Reload Pixiv and try again.', "瀏覽器操作失敗，請重新整理 Pixiv 後再試一次。"],
    '不支持的 Cookie 范围。': ['対応していない Cookie の範囲です。', 'Unsupported cookie scope.', "不支援此 Cookie 範圍。"],
    '该登录状态已过期，请重新登录。': ['ログイン状態の有効期限が切れています。再ログインしてください。', 'This session has expired. Log in again.', "此登入狀態已過期，請重新登入。"],
    '登录身份校验失败，目标账号可能需要重新登录。': ['アカウントの確認に失敗しました。切り替え先のアカウントで再ログインが必要な可能性があります。', 'Account verification failed. The target account may need to log in again.', "登入身分驗證失敗，目標帳號可能需要重新登入。"],
    '切换失败且自动恢复未完成。请打开扩展重试恢复，暂时不要在 Pixiv 操作。': ['切り替えに失敗し、自動復元も完了していません。拡張機能を開いて復元を再試行し、それまでは Pixiv で操作しないでください。', 'Switching failed and automatic recovery did not finish. Open the extension to retry recovery. Avoid using Pixiv until then.', "切換失敗且尚未完成自動還原。請開啟擴充功能重試還原，暫時不要在 Pixiv 上操作。"]
  };
  function normalize(value) {
    const [base, ...parts] = String(value || '').trim().toLowerCase().split(/[-_]/);
    if (base === 'zh') {
      // An explicit script takes priority over the region (e.g. zh-Hans-TW).
      if (parts.includes('hans')) return 'zh';
      if (parts.includes('hant') || parts.some(part => ['tw', 'hk', 'mo'].includes(part))) return 'zh-Hant';
      return 'zh';
    }
    return ['ja', 'en'].includes(base) ? base : null;
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
    return language === 'zh' ? source : messages[source]?.[{ja: 0, en: 1, 'zh-Hant': 2}[language]] ?? source;
  }
  globalThis.PixivAccountI18n = {
    normalize, fromURL, detect, browserLanguages, pageLanguage, setLanguage, t,
    get language() { return language; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    syncPageLanguage() { setLanguage(pageLanguage()); }
  };
})();
