---
title: Windows 远程桌面下 Ant Design 下拉菜单不显示
date: 2026-11-03
tags:
  - CSS
  - Windows
  - Ant Design
  - Firefox
  - 故障排查
description: Windows 远程桌面下 Ant Design 下拉框点开后只闪滚动条、不见菜单，顺着 prefers-reduced-motion 查出是 0.01ms 全局过渡打乱了弹层同步测量。
outline: deep
aside: true
---

# Windows 远程桌面下 Ant Design 下拉菜单不显示

<!-- DESC SEP -->

Windows 远程桌面下 Ant Design 下拉框点开后只闪滚动条、不见菜单，顺着 prefers-reduced-motion 查出是 0.01ms 全局过渡打乱了弹层同步测量。

<!-- DESC SEP -->

平时开发企智盒，我都在本机用 Firefox 调试，页面一直很安分。

前两天把程序部署到另一台 Windows 电脑，通过远程桌面（RDP）连过去，用 Edge 打开 `http://localhost:8080`。点了一下顶部的助手下拉框，菜单没有弹出来，反倒是页面右侧和底部的滚动条同时闪了一下，又立刻缩了回去。再点左下角的账户入口想退出登录，依然只有两条滚动条一闪而过，菜单不见踪影。

在远程电脑上换 Chrome 试，毛病一模一样。可切回我自己的电脑，顺着局域网 IP 访问同一台机器上的同一个服务，Firefox 和 Chrome 都能正常展开菜单。

| 访问环境                 | 浏览器  | 助手下拉框与账户菜单         |
| ------------------------ | ------- | ---------------------------- |
| 远程 Windows 桌面        | Edge    | 点击后滚动条闪现，菜单不显示 |
| 远程 Windows 桌面        | Chrome  | 同样异常                     |
| 本机通过局域网访问同服务 | Firefox | 正常                         |
| 本机通过局域网访问同服务 | Chrome  | 正常                         |

同一个 Chrome 访问同一个服务，换台电脑就正常，说明问题出在那台远程 Windows 的运行环境上。

点击瞬间横竖滚动条同时闪现，也留下了线索。助手切换用的是 [Ant Design](https://ant.design/) `Select`，账户菜单用的是 `Dropdown`，两处入口点击后都会往页面挂载弹层。滚动条被撑开又缩回，说明弹层多半已经生成，只是落到了屏幕外某个很远的位置。

## 关掉的窗口动画与 0.01ms

我拉上 Codex 一起核对远程电脑配置与前端代码。

检查远程电脑时，先发现当前账户注册表里的 `MinAnimate` 为 `0`，窗口动画处于关闭状态。在 Windows 11 里，这个开关对应「设置 → 辅助功能 → 视觉效果 → 动画效果」，远程桌面会话或系统性能设置经常会把它关掉。

光看注册表还不能直接代表网页拿到的状态。想知道浏览器有没有跟着系统关闭动画，最直接的办法是在页面上按 `F12`，打开控制台查一下 [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) 媒体查询。Firefox、Edge 和 Chrome 都能直接运行：

```js
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

远程桌面里的浏览器返回 `true`，本机浏览器返回 `false`。差别终于对上了。

顺着这个条件翻看前端样式表，项目里刚好有一段全局规则，在命中 `prefers-reduced-motion: reduce` 时生效：

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

这套写法在不少 CSS Reset 模板里都能见到，初衷是把动画和过渡时间压到 `0.01ms`，既能抹掉肉眼可见的动态效果，又保留相关事件触发。

肉眼确实看不出 `0.01ms` 的过渡，可在浏览器的布局与过渡状态机里，它依然大于零。

## 飞到 (-16000, -9000) 的弹层

一段只有 `0.01ms` 的过渡，为什么会把下拉菜单弄丢？

点开下拉框后，去开发者工具里找 `.ant-select-dropdown` 或 `.ant-dropdown`，在控制台调用 [`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) 读取弹层相对视口的位置：

```js
document.querySelector('.ant-select-dropdown')?.getBoundingClientRect()
```

在 `1600 × 900` 视口下把普通模式和减少动态效果模式摆在一起对比，数字一下子就说明白了：

- 普通模式下，助手菜单的坐标为 `(222, 132)`，稳稳贴在按钮下方；
- 切换到减少动态效果模式，同一个菜单的坐标变成了 `(-16000, -9000)`，账户菜单也跟着飞到了屏幕外。

`(-16000, -9000)` 刚好是 `1600 × 900` 视口的负十倍。弹层早已渲染进 DOM，只是停在了左上角十倍视口之外。定位过程中异常坐标短暂撑大页面范围，便激出了开头看到的那一下横竖滚动条闪烁。

项目当时使用的是 `antd 6.6.3` 和 `@rc-component/trigger 3.10.1`。弹层对齐前，`trigger` 会先把元素放在屏幕外，测量时临时把坐标归零，再结合按钮位置换算最终坐标。`useAlign` 里的关键步骤可以简化成三行：

```js
popupElement.style.left = '0'
popupElement.style.top = '0'
const popupRect = popupElement.getBoundingClientRect()
```

这段逻辑依赖一个前提：把 `left` 和 `top` 设为 `'0'` 之后，下一行同步调用的 `getBoundingClientRect()` 能够立刻读到归零后的位置。

偏偏全局样式加上了 `* { transition-duration: 0.01ms !important }`，而 `transition-property` 的默认值又是 `all`，连 `left` 和 `top` 的坐标修改也被迫带上了 CSS 过渡。

当 `left` 和 `top` 从屏幕外改写成 `'0'` 时，`0.01ms` 的过渡刚刚开始。Chromium 在同一帧内同步测量，拿到的仍是过渡起点的旧坐标。`useAlign` 拿着远在屏幕外的起点坐标去算偏移，算出来的落点自然也就留在了 `(-16000, -9000)`。

翻看社区记录，[react-component/trigger issue #618](https://github.com/react-component/trigger/issues/618) 报告过一模一样的故障。那条记录基于 antd 5 与较早版本的 `trigger`，到了 antd 6 依然会踩中同一套同步测量机制。

## 把过渡时间改回 0s

定位清楚后，改动只有一行，把减少动态效果模式下的过渡时间设为 `0s`：

```diff
-    transition-duration: 0.01ms !important;
+    transition-duration: 0s !important;
```

按照 [CSS Transitions 规范](https://www.w3.org/TR/css-transitions-1/#transition-duration-property)，`transition-duration` 的初始默认值就是 `0s`。只要没有额外的过渡延迟，时长设为零就不会启动过渡，测量前重置 `left` 与 `top` 会当场生效。

加载新样式后重新验证，不论在普通模式还是减少动态效果模式下，助手下拉框与账户菜单都能正常展开，点击时页面也不再闪现滚动条。
