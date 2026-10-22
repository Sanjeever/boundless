---
title: WeChat OAuth Toolbar on iOS
date: 2026-10-11
tags:
  - WeChat
  - iOS
  - H5
  - OAuth
description: Tracing the bottom toolbar after WeChat OAuth on iOS and moving authorization ahead of the first page render.
outline: deep
aside: true
---

# WeChat OAuth Toolbar on iOS

<!-- DESC SEP -->

After WeChat authorization, a back-and-forward toolbar appeared at the bottom of my H5 page. I traced the redirects one step at a time, then moved authorization ahead of the first page render. The page filled the screen again.

<!-- DESC SEP -->

I've been working on a campaign for a WeChat Official Account. Visitors watch an opening sequence that fills the screen, then tap “开始征途” (Start the Journey) to sign in.

The page looked fine when first opened. After authorization returned to the app, a toolbar appeared along the bottom. It cut off part of the button and half a line of text near the top. The logs showed the viewport height dropping from 774 to 691, a difference of 83 CSS pixels.

I started with the navigation code. The router already used `router.replace()`, and sign-in began with `location.replace()`. The Go backend returned a 302 both when sending users to WeChat and when handling the authorization callback, with nginx acting as a reverse proxy. Everything looked reasonable. Back on the phone, the toolbar kept appearing.

Another common suggestion was `WeixinJSBridge.call('hideToolbar')`. I called it when the Bridge became ready and added a button for a manual call. The automatic call had no effect. I waited more than ten seconds and pressed the button, but the toolbar didn't move. The logs confirmed that the call had run without explaining why the screen stayed the same.

## One extra history entry

Next, I wanted to find where the history count increased.

The login endpoint and callback both returned a 302, so there was no page where I could pause and read the values on my phone. I temporarily changed both responses into diagnostic pages. Each page recorded `history.length` and waited for me to press Continue.

The first leg behaved as expected. The campaign page and login entry both had a history length of 1. After the trip through WeChat, the callback page reported 2, and the toolbar appeared there. Returning to the app kept the count at 2.

The extra entry appeared during the authorization round trip. Both Continue buttons used `location.replace()`, but the count went up anyway.

I tried going back too. The callback page returned to the login entry. The back arrow turned gray, the forward arrow became available, and the toolbar stayed on screen. Pressing Forward ran the old callback again and triggered a `state` validation error. The forward entry remained in history, but that authorization state had already been consumed.

Changing the redirects, calling the hide API, and going back had all failed to restore the screen. I began looking at how the page was opened.

The app displayed its opening sequence before sending the visitor to WeChat. What would happen if the first request went straight to authorization, with the page appearing after the return?

I added a temporary link and sent it to a WeChat chat. Then I closed the current page and opened the link from the message. The server generated the authorization state and immediately returned a 302. This time, neither the opening sequence nor the login diagnostic page appeared first.

On return, the callback page had a history length of 1. There was no toolbar. I pressed Continue to return to the app. The count stayed at 1, and the whole button was visible.

| How the page was opened | At the callback | Back in the app | Toolbar |
| --- | --- | --- | --- |
| Render the page, then authorize | 2 | 2 | Present |
| Authorize on the first request | 1 | 1 | Absent |

The numbers are `history.length`. On this phone, omitting the page before authorization avoided the toolbar, which supported changing the entry point first. The test did not establish how WeChat manages history internally or whether every iOS WeChat version behaves the same way. Go was already returning 302 responses, and I left nginx unchanged.

## Changing the entry point

The production code adds a server entry point that checks the login session. A valid session goes straight to the H5 page. A missing or expired session starts WeChat authorization. The handler reuses the existing session validation and authorization functions.

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

Within the same request, `login` prepares the authorization parameters and returns a 302 to WeChat. The callback validates the response, creates a session, and redirects to `/h5/`. The browser starts displaying the campaign page at that point.

The Official Account menu and external links should all use this entry point. With an example domain, the address is:

```text
https://activity.example.com/api/h5/auth/entry
```

The path matters too. The login cookie in this project uses `Path=/api/h5/`, so the browser doesn't send it when requesting the root path `/`. Putting the entry at `/api/h5/auth/entry` lets it read the existing cookie. The root path can redirect there. [Cookie path documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value)

This changes when visitors authorize. They now complete authorization as they enter from the Official Account link, then watch the opening sequence. The Start the Journey button stays in place, but no longer starts sign-in. A project that requires visitors to finish the opening sequence before authorizing would need a different arrangement.

I also removed the code that could start another authorization flow from within the H5 page. If the session expires, the page asks the visitor to close it and reopen the app from the Official Account entry, avoiding the earlier redirect path.

Finally, I removed the temporary diagnostic pages and buttons, restored the callback's automatic 302, and opened the production entry from a fresh WeChat message. This time, authorization flowed into the opening sequence and on to the route map. The button was fully visible. The toolbar never appeared.
