---
title: Windows 远程桌面下 Ant Design 下拉菜单不显示
date: 2026-11-03
tags:
  - CSS
  - Windows
  - Ant Design
  - Firefox
  - 故障排查
description: Windows 远程桌面中 Ant Design 下拉框不显示、滚动条闪现，排查发现 prefers-reduced-motion 与全局 CSS 过渡冲突，将过渡时间设为零后恢复正常。
outline: deep
aside: true
---

# Windows 远程桌面下 Ant Design 下拉菜单不显示

<!-- DESC SEP -->

Windows 远程桌面中 Ant Design 下拉框不显示、滚动条闪现，排查发现 prefers-reduced-motion 与全局 CSS 过渡冲突，将过渡时间设为零后恢复正常。

<!-- DESC SEP -->

我平时开发主要用 Firefox，企智盒本机页面一直正常。最近把程序部署到另一台 Windows 电脑，通过远程桌面（RDP）连过去，用 Edge 打开 `http://localhost:8080`，碰到一个奇怪问题。

点击下拉框切换助手，页面短暂出现纵向和横向滚动条，随后消失，下拉菜单没有弹出来。再点左下角账户入口，想退出登录，也只有滚动条闪一下，账户菜单没有出现。

换 Chrome 试，还是一样。回到自己电脑，通过局域网 IP 访问同一个服务，Firefox 和 Chrome 都能正常操作。

## 同一个页面，为什么换台电脑就正常

当时能确认四组结果。

| 访问环境          | 浏览器  | 助手下拉框与账户菜单         |
| ----------------- | ------- | ---------------------------- |
| 远程 Windows 桌面 | Edge    | 点击后滚动条闪现，菜单不显示 |
| 远程 Windows 桌面 | Chrome  | 同样异常                     |
| 本机访问远程服务  | Firefox | 正常                         |
| 本机访问远程服务  | Chrome  | 正常                         |

单看 Firefox 正常，很容易先怀疑浏览器兼容性。但 Chrome 在两台电脑上表现不同，问题范围还得往环境上看。

我请 Codex 协助检查代码和远程电脑。助手切换使用 [Ant Design](https://ant.design/) Select，账户菜单使用 Dropdown。两处入口都涉及弹层定位。既然点击后滚动条会变化，就值得确认弹层是否已经生成，只是位置不对。

## Windows 动画设置与 prefers-reduced-motion

检查远程电脑时，先发现账户注册表中 `MinAnimate` 为 `0`，窗口动画处于关闭状态。顺着这个线索回看代码，项目恰好有一段样式，会在 [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) 命中时生效。

这个查询让网页跟随用户“减少动态效果”偏好。Windows 11 相关入口在“设置 → 辅助功能 → 视觉效果 → 动画效果”。关闭动画后，浏览器可能命中这段样式。

注册表状态还不能直接代表网页查询结果。遇到类似情况，可以在浏览器按 `F12`，打开控制台运行下面这句，先确认当前页面是否命中。Firefox、Edge 和 Chrome 都适用。

```js
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

返回 `true`，表示当前页面处于减少动态效果模式。接下来就要检查这个条件下哪些 CSS 会生效。

企智盒当时有这样一段全局规则。

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

这段代码原本用来减少动画，把持续时间压缩到 `0.01ms`。肉眼看不出过渡，但它仍然大于零。

## Select 和 Dropdown 弹层坐标异常

接下来，我让 Codex 对同一个部署页面做对照验证。在 `1600 × 900` 视口中，普通模式下助手菜单坐标为 `(222, 132)`；切换到减少动态效果模式，坐标变成 `(-16000, -9000)`。账户菜单也出现相同问题。

这样就能解释为什么点击后看不到菜单。弹层确实存在，位置却在屏幕外。

想检查自己页面，可以先展开下拉框，再到开发者工具里查看 `.ant-select-dropdown` 或 `.ant-dropdown`。以 Select 为例，在控制台读取位置。

```js
document.querySelector('.ant-select-dropdown')?.getBoundingClientRect()
```

[`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) 返回元素尺寸及其相对视口位置。如果弹层存在，坐标却远远超出窗口范围，就该沿着定位过程继续查。

项目当时使用 antd 6.6.3 和 `@rc-component/trigger 3.10.1`。弹层定位前，trigger 会先把元素放在屏幕外，测量时临时归零，再根据按钮位置计算最终坐标。`useAlign` 中，关键顺序可以简化成三行。

```js
popupElement.style.left = '0'
popupElement.style.top = '0'
const popupRect = popupElement.getBoundingClientRect()
```

这段计算依赖一个前提，写入 `0` 后，马上测量就能拿到归零位置。

可全局 `transition-duration: 0.01ms !important` 会让位置变化也参与过渡。`transition-property` 默认值为 `all`，所以 `left` 和 `top` 也可能产生过渡。Chromium 在同步测量时仍可能返回过渡起点位置，接下来算出坐标就会偏离。

[react-component/trigger issue #618](https://github.com/react-component/trigger/issues/618) 记录过同一种故障，包含 `left`、`top` 重置和同步测量过程。报告使用 antd 5 与更早一版 trigger，本次 antd 6 也能复现。

定位期间，异常坐标还可能短暂撑大页面范围，与开始看到横向、纵向滚动条闪现相吻合。

对照验证能确认，这段 CSS 在减少动态效果模式下会触发故障。至于远程桌面是否必然触发这种偏好，还不能下结论。排查其他机器时，应以实际媒体查询结果为准，本机 Firefox 正常不能替其他环境作判断。

## 修复 CSS，将 transition-duration 改为 0s

最后改动集中在一行，把减少动态效果模式下过渡时间设为零。

```diff
-    transition-duration: 0.01ms !important;
+    transition-duration: 0s !important;
```

[CSS Transitions 规范](https://www.w3.org/TR/css-transitions-1/#transition-duration-property) 将 `0s` 作为默认过渡时间。本次位置变化没有额外过渡延迟，改成零后，测量前重置坐标便能立即生效。

加载修改后样式再检查，助手下拉框与账户菜单都能正常展开，普通模式和减少动态效果模式均通过验证，页面也没有额外滚动范围。前端生产构建通过，修复已提交。

遇到 Ant Design 下拉框不显示，尤其伴随滚动条闪现时，我会先看弹层是否存在、坐标是否异常，再检查 `prefers-reduced-motion` 和全局过渡样式。这次本机测试一直正常，遗漏恰好就在系统偏好这个条件上。
