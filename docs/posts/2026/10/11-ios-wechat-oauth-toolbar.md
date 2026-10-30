---
title: iOS 微信授权底栏
date: 2026-10-11
tags:
  - 微信
  - iOS
  - H5
  - OAuth
description: 微信 OAuth 授权跳回后，整屏 H5 底部多出一条前进后退栏；把授权挪到首屏渲染之前，视口才重回整屏。
outline: deep
aside: true
---

# iOS 微信授权底栏

<!-- DESC SEP -->

微信 OAuth 授权跳回后，整屏 H5 底部多出一条前进后退栏；把授权挪到首屏渲染之前，视口才重回整屏。

<!-- DESC SEP -->

最近在做一个公众号活动页。开篇是整屏海报，用户看完点“开始征途”再发起微信登录。

第一次点进链接时画面好好的。可一旦跳去微信授权再回到页面，屏幕底下就多出了一条白底的前进后退栏。原本居底的按钮被截掉半截，日志里的视口高度从 `774` 掉到了 `691`，活生生被吃掉了 `83px`。

先查了一圈跳转写法：前端路由用的是 `router.replace()`，跳登录用的是 `location.replace()`，Go 后端去微信和回调也都是 `302`。顺手试了网上常说的 `WeixinJSBridge.call('hideToolbar')`，无论是自动调还是绑在按钮上手点，底栏都纹丝不动。

## 抓出多出来的那条历史

既然底栏是因为 WebView 认为“可以后退”才弹出来的，那 `history.length` 到底是在哪一步涨上去的？

原本登录和回调接口都是直接 `302`，一闪而过看不见状态。我把这两个接口临时改成了停留页，印出当前的 `history.length`，点“继续”再执行 `location.replace()`。

跑下来一看，账很清楚：

- 从活动首页进登录入口，`history.length` 一直是 `1`；
- 经过微信授权跳回回调页，数字变成了 `2`，底栏同时冒了出来；
- 再回到活动页，数字停在 `2`。

只要先渲染了页面再跳去微信授权，回来就会多出一条历史记录，哪怕全程用 `replace` 也拦不住。

那要是反过来呢？第一次请求连页面都不渲染，直接由后端返回 `302` 去微信授权，等拿完身份跳回来才第一次渲染 H5，会怎样？

我加了个临时后端入口发到微信聊天里，关掉旧网页重新点开。服务端生成 `state` 后直接 `302` 去微信；授权回来落到回调页时，`history.length` 是 `1`，底栏消失了，视口重新撑满全屏。

| 打开顺序 | 回调时 `history.length` | 进活动页时 `history.length` | 底部工具栏 |
| --- | --- | --- | --- |
| 先渲染页面，点按钮再授权 | 2 | 2 | 出现 |
| 首次请求直接 302 去授权 | 1 | 1 | 不出现 |

## 把授权挪到首屏之前

找到规律后，改动就简单了：在 Go 后端加一个统一的入口 handler。有合法会话就直接 `302` 进 `/h5/`；没会话或已过期，当场在第一次请求里 `302` 去微信授权：

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

公众号菜单和分享链接统一填这个入口地址：

```text
https://activity.example.com/api/h5/auth/entry
```

这里顺带要注意 Cookie 的 [`Path` 属性](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value)：项目里的会话 Cookie 绑在 `Path=/api/h5/` 下，把入口同样放在 `/api/h5/auth/entry`，浏览器第一次请求时才会乖乖带上已有的 Cookie。

把临时诊断页撤掉，从微信聊天窗口重新点进正式入口：无感授权、跳回 `/h5/`、播开篇动画，整屏海报严丝合缝，那条烦人的底栏再也没露过面。
