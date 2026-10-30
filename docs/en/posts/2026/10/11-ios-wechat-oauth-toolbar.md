---
title: WeChat OAuth Toolbar on iOS
date: 2026-10-11
tags:
  - WeChat
  - iOS
  - H5
  - OAuth
description: Returning from WeChat OAuth on iOS triggered a bottom navigation bar that clipped our full-screen H5 page, until we moved the redirect ahead of the first render.
outline: deep
aside: true
---

# WeChat OAuth Toolbar on iOS

<!-- DESC SEP -->

Returning from WeChat OAuth on iOS triggered a bottom navigation bar that clipped our full-screen H5 page, until we moved the redirect ahead of the first render.

<!-- DESC SEP -->

While building a full-screen H5 campaign for a WeChat Official Account, the flow started with an opening poster: visitors watched the intro, then tapped “Start the Journey” to sign in via WeChat OAuth.

On first load, the layout filled the screen. The moment WeChat OAuth redirected back, however, a white back-and-forward toolbar popped up along the bottom, slicing off the call-to-action button and shrinking the viewport height from `774px` to `691px`—an `83px` bite out of a fixed screen.

I checked our navigation code first: Vue Router used `router.replace()`, the login trigger used `location.replace()`, and the Go backend returned `302` redirects on both ends. Calling `WeixinJSBridge.call('hideToolbar')`—both automatically on bridge ready and from a test button—did nothing at all.

## Catching the Extra History Entry

Since WeChat’s WebView shows the bottom toolbar whenever back-navigation is possible, I wanted to see where `history.length` ticked up.

Because `302` redirects flash past too quickly to inspect on a phone, I temporarily replaced the login and callback endpoints with pause pages that printed `history.length` and waited for a tap before calling `location.replace()`.

The numbers told the story right away:

- Opening the campaign page and moving to the login page kept `history.length` at `1`.
- Returning from WeChat OAuth to the callback page bumped `history.length` to `2`, and the bottom toolbar appeared on the spot.
- Continuing back to the campaign page left `history.length` stuck at `2`.

As long as the WebView rendered a page *before* jumping to WeChat’s OAuth URL, the round trip added a history entry even when every client transition used `replace()`.

What if the very first HTTP request never rendered a page at all, and instead returned a `302` straight to WeChat OAuth—rendering the H5 app only after the callback returned?

I wired up a test endpoint, sent the link to a WeChat chat, and tapped it fresh. The server generated the OAuth `state` and immediately returned a `302`. When WeChat redirected back to the callback page, `history.length` stayed at `1`, and the bottom toolbar never appeared.

| Entry Flow | `history.length` at Callback | `history.length` in App | Bottom Toolbar |
| --- | --- | --- | --- |
| Render page first, then redirect to OAuth | 2 | 2 | Appears |
| Return 302 to OAuth on the very first request | 1 | 1 | Hidden |

## Moving OAuth Ahead of First Render

With the cause clear, the fix was a small entry handler in Go: if the user already has a valid session cookie, redirect to `/h5/`; if not, kick off the OAuth `302` right on the initial request:

```go
func (a *Auth) entry(w http.ResponseWriter, r *http.Request) {
	_, err := a.sessionUser(r)
	if errors.Is(err, errSessionRequired) || errors.Is(err, errSessionExpired) {
		a.login(w, r)
		return
	}
	if err != nil {
		authorizationFailure(w, r, 500, "读取用户会话失败", "service")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, a.cfg.PublicURL+"/h5/", http.StatusFound)
}
```

Official Account menu items and shared links now point to this server entry point:

```text
https://activity.example.com/api/h5/auth/entry
```

One small detail to watch is the cookie’s [`Path` attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value): because our session cookie was scoped to `Path=/api/h5/`, placing the entry route under `/api/h5/auth/entry` ensured the browser sent existing session cookies on the initial hit.

After removing the diagnostic pages and opening the production entry link from WeChat, OAuth completed before the first paint, `/h5/` opened with `history.length === 1`, and the full-screen layout stayed intact.
