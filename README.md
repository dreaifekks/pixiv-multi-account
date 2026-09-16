# Pixiv 账号切换 · 0.3.1

登录后自动记住账号，之后在 Pixiv 头像菜单里点一下切换。

## 使用

1. 在 Pixiv 正常登录，账号会自动加入列表。
2. 想加小号时点“添加账号”，在打开的官方页面登录即可。
3. 登录完成后自动记住小号，不需要点保存或完成。
4. 点击列表中的账号切换；当前账号旁会显示“当前”。

添加过程中不想继续，可以点“返回原账号”。所有 Pixiv 标签页共用当前账号，切换后会一起刷新。

## 更新

覆盖原加载目录，在 `chrome://extensions` 点击扩展的“重新加载”，然后刷新 Pixiv。沿用原目录即可保留已有账号，不用卸载。由 0.1.x 更新时，如 Chrome 提示允许 Pixiv 访问，完成提示即可。

首次安装：在 Chrome 的扩展管理页打开开发者模式，选择“加载已解压的扩展程序”，选中含有 `manifest.json` 的目录。

头像菜单里的区域跟随 Pixiv 原生面板宽度；也可以通过 Chrome 工具栏打开账号列表。

界面支持中文、日语和英语：优先跟随当前 Pixiv 页面的 `lang`，缺失时读取网址语言前缀，再使用浏览器语言；其他网站语言回退为英语。繁体中文暂共用简体中文文案。页面语言改变时，菜单及切换提示同步更新。工具栏弹窗打开时读取当前 Pixiv 标签页的语言；在其他网站打开则使用浏览器语言。

## 这一版

- 菜单、弹窗及状态提示新增中日英文案，自动跟随当前 Pixiv 页面语言。

- 登录 Cookie 变化时在后台自动识别、记录账号，不依赖面板是否打开。
- 页面打开时补充识别当前登录，已有账号更新会话，新账号加入列表。
- 添加后的登录自动结束添加流程，不再需要保存或完成按钮。
- 界面保留账号列表、当前标记和添加入口；只有操作失败时才显示简短提示。

## 开发

### 自动打包

仅推送以 `v` 开头的版本标签（例如 `v0.3.0`）时，GitHub Actions 才会先运行测试，再生成扩展 ZIP。成功后在 **Actions → Package extension** 对应运行的 **Artifacts** 下载 `pixiv-multi-account-版本号.zip`，产物保留 30 天。解压后按上面的首次安装或更新方式加载。

本地打包只需要 Node.js 24 和 npm：

```sh
npm ci
npm test
npm run package
```

输出为 `dist/pixiv-multi-account-版本号.zip`，版本取自 `manifest.json`，并检查与 `package.json` 一致。ZIP 根目录直接包含 `manifest.json` 和根目录的 JS、HTML、CSS 运行文件，不包含测试、开发脚本或本地记录。新增资源子目录时，需要同步更新 `scripts/package.mjs`。`fflate` 仅作为开发依赖生成 ZIP，不会打入扩展。

### 实现与测试

没有构建步骤或运行时依赖。使用 Chrome Manifest V3，权限为 `cookies`、`storage` 和三个精确域名 `pixiv.net`、`www.pixiv.net`、`accounts.pixiv.net` 的 HTTP/HTTPS 访问。网络核验、登录页和 Cookie 写回使用 HTTPS。

会话以 `PHPSESSID` 为基础，记录在 `chrome.storage.local`。读取实际用户身份后按用户 ID 归档，不存密码、不上传第三方服务。识别失败不会覆盖已有账号；切换失败会尝试恢复原会话。

```powershell
node --test tests/*.test.mjs
```

自动化测试覆盖登录后自动记录、无需面板的 Cookie 事件、自动完成添加、首次页面同步、权限过滤、失效会话、切换与回滚等。`tests/preview.html` 为合成账号的交互演示。

已完成自动化和本地界面验证。当前工具禁止访问 Pixiv，尚未完成真实账号端到端验证。
