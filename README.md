# Pixiv Account Switcher

**English** · [中文](README.cn.md) · [日本語](README.jp.md)

Switch between accounts you have logged in to, right from Pixiv’s profile menu.

Accounts are remembered automatically after login, with no manual save step. Next time you open Pixiv, choose an account and get back to browsing or creating.

## Features

- **Automatic account saving**: log in to Pixiv as usual and your account appears in the list.
- **Two ways to switch**: open the account list from Pixiv’s profile menu or the browser toolbar.
- **Follows the website language**: Simplified Chinese, Traditional Chinese, Japanese and English text adapts to the current Pixiv page.
- **Local storage**: account details and login sessions stay in the current browser profile, with no cloud sync.

## How to use

1. Log in to Pixiv and open the profile menu to see your current account.
2. Click **Add account** and log in to another account on the official Pixiv page that opens.
3. The new account is added to the list automatically after login.
4. Click an account to switch to it. The active account is marked **Current**.

You can cancel adding an account with **Return to previous account**. The extension icon in the browser toolbar also opens the account list.

Pixiv tabs in the same browser profile share one login session. Switching accounts reloads open Pixiv main-site pages. This extension lets you switch between accounts; it does not keep separate accounts signed in simultaneously in different tabs. When a session expires, log in again on Pixiv.

## Install and update

Requires **Chrome 124 or later**. Incognito mode is not supported.

1. Download `pixiv-multi-account-VERSION.zip` from [Releases](https://github.com/dreaifekks/pixiv-multi-account/releases/latest) and extract it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the directory containing `manifest.json`.
4. Reload any open Pixiv pages.

To update, replace the files in the original extension directory, click **Reload** on the extension management page, and reload Pixiv. Keep the same directory and extension installation to retain saved accounts; there is no need to uninstall. Allow Pixiv site access if Chrome prompts you.

## Interface language

The extension prefers the current Pixiv page’s language. If unavailable, it checks the language in the URL, then the browser language. The menu and switching message update when the page language changes.

The toolbar popup reads the current Pixiv tab’s language when opened. On other websites, it uses the browser language. Simplified and Traditional Chinese each have their own translations. Unsupported site languages use English.

## Privacy and permissions

The extension stores account IDs, display names, avatar URLs and login sessions locally to display and switch accounts. It does not read or store passwords, use analytics, or upload data to a developer-operated server. Account verification connects directly to Pixiv, and avatars load from Pixiv’s image servers.

| Permission | Purpose |
| --- | --- |
| `cookies` | Read and restore Pixiv login cookies to switch accounts. |
| `storage` | Store accounts, sessions and recovery records for failed operations locally. |
| Pixiv site access | Verify account identity, access the relevant cookies and display the switcher on Pixiv’s main site. |

Host permissions cover only `pixiv.net`, `www.pixiv.net` and `accounts.pixiv.net`. Account verification requests, login pages and cookie restoration use HTTPS.

This is an independently developed, unofficial extension with no affiliation with Pixiv.

## Support

If the account list is out of date, click **Refresh**. If switching stops working after an extension update, reload all open Pixiv pages and try again.

For other problems, open a [GitHub Issue](https://github.com/dreaifekks/pixiv-multi-account/issues) with your Chrome version, extension version, page language and steps to reproduce. Do not include cookies or login session values.

## Development

Uses Chrome Manifest V3 with no compilation step or runtime dependencies. Testing and packaging require Node.js 24 and npm:

```sh
npm ci
npm test
npm run package
```

The package is written to `dist/pixiv-multi-account-VERSION.zip`. Versions in `manifest.json` and `package.json` must match. `fflate` is used only for packaging and is not shipped with the extension. Update `scripts/package.mjs` when adding resource subdirectories.

Pushing a `v*` tag matching the version, such as `v0.3.2`, triggers tests, packaging and publication of a GitHub Release. Ordinary branch pushes do not trigger packaging.

Automated tests cover account identification, adding accounts, switching and rollback, permission checks and language detection. `tests/preview.html` provides a synthetic-account demo with controls for language, light/dark themes and panel width.
