---
title: Ant Design Dropdowns Not Showing over Windows Remote Desktop
date: 2026-11-03
tags:
  - CSS
  - Windows
  - Ant Design
  - Firefox
  - Troubleshooting
description: Ant Design dropdowns failed to appear and scrollbars flashed over Windows Remote Desktop, traced to a conflict between prefers-reduced-motion and global CSS transitions that disappeared when the transition duration was set to zero.
outline: deep
aside: true
---

# Ant Design Dropdowns Not Showing over Windows Remote Desktop

<!-- DESC SEP -->

Ant Design dropdowns failed to appear and scrollbars flashed over Windows Remote Desktop, traced to a conflict between prefers-reduced-motion and global CSS transitions that disappeared when the transition duration was set to zero.

<!-- DESC SEP -->

I mainly use Firefox for development, and Qizhihe had been working fine on my own computer. After deploying it to another Windows machine, I connected through Remote Desktop (RDP), opened `http://localhost:8080` in Edge, and ran into a strange problem.

Clicking the assistant selector briefly brought up both vertical and horizontal scrollbars. They disappeared a moment later, but the dropdown never appeared. I then clicked the account button in the bottom-left corner to sign out. The scrollbars flashed again, with no account menu in sight.

Chrome behaved the same way on that machine. Back on my own computer, accessing the same service through its LAN IP address worked in both Firefox and Chrome.

## Why did the same page work on another computer?

I had four results to compare.

| Access environment                        | Browser | Assistant selector and account menu      |
| ----------------------------------------- | ------- | ---------------------------------------- |
| Remote Windows desktop                    | Edge    | Scrollbars flashed; menus did not appear |
| Remote Windows desktop                    | Chrome  | Same problem                             |
| My computer, accessing the remote service | Firefox | Worked                                   |
| My computer, accessing the remote service | Chrome  | Worked                                   |

Firefox working could easily suggest a browser compatibility issue. But Chrome behaved differently on the two computers, so the environment needed a closer look too.

I asked Codex to help inspect the code and the remote machine. The assistant selector used [Ant Design](https://ant.design/) Select, while the account menu used Dropdown. Both needed to position a popup. Since clicking caused the scrollbars to change, it was worth checking whether the popup had been created but placed somewhere unexpected.

## Windows animation settings and prefers-reduced-motion

The remote machine had `MinAnimate` set to `0` in the user's registry, indicating that window animations were disabled. Following that clue back to the code turned up a stylesheet rule applied when [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) matched.

This media query lets a page respect the user's preference for reduced motion. In Windows 11, the relevant setting is under **Settings → Accessibility → Visual effects → Animation effects**. Turning animations off can cause the browser to apply reduced-motion styles.

The registry setting alone does not establish what the page's media query returns. If you encounter something similar, press `F12`, open the browser console, and check the page directly. This works in Firefox, Edge, and Chrome.

```js
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

A result of `true` means the page is currently in reduced-motion mode. The next step is to check which CSS rules apply under that condition.

Qizhihe had this global rule at the time.

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

The intention was to reduce motion by shortening durations to `0.01ms`. You cannot see a transition that short, but its duration is still greater than zero.

## Select and Dropdown popups had incorrect coordinates

Next, I asked Codex to compare the same deployed page with and without the reduced-motion preference. In a `1600 × 900` viewport, the assistant menu appeared at `(222, 132)` under normal settings. With reduced motion enabled, its coordinates became `(-16000, -9000)`. The account menu had the same problem.

That explained why clicking seemed to do nothing. The popup existed, but it was outside the viewport.

To inspect your own page, click the selector and look for `.ant-select-dropdown` or `.ant-dropdown` in the developer tools. For Select, you can read its position from the console.

```js
document.querySelector('.ant-select-dropdown')?.getBoundingClientRect()
```

[`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) returns an element's dimensions and position relative to the viewport. If the popup exists but its coordinates are far outside the window, the positioning process is worth investigating.

The project was using antd 6.6.3 and `@rc-component/trigger 3.10.1`. Before positioning a popup, trigger places it offscreen, temporarily resets its coordinates to zero for measurement, and then calculates its final position relative to the button. The key sequence in `useAlign` can be reduced to three lines.

```js
popupElement.style.left = '0'
popupElement.style.top = '0'
const popupRect = popupElement.getBoundingClientRect()
```

This calculation assumes that measuring immediately after writing `0` will return the reset position.

But the global `transition-duration: 0.01ms !important` rule lets position changes transition too. The default value of `transition-property` is `all`, so `left` and `top` can also transition. During synchronous measurement, Chromium may still return the position at the start of the transition, throwing off the coordinates calculated next.

[react-component/trigger issue #618](https://github.com/react-component/trigger/issues/618) documents the same failure, including the `left` and `top` resets and the synchronous measurement. That report used antd 5 and an earlier trigger release; the issue also reproduced with antd 6 in this case.

Incorrect coordinates can briefly expand the page's scrollable area during positioning, which fits the horizontal and vertical scrollbars flashing at the beginning.

The comparison confirmed that this CSS rule could trigger the failure under reduced motion. It did not establish that a Remote Desktop connection always triggers that preference. On another machine, check the actual media query result; Firefox working on my computer does not settle what happens elsewhere.

## Fixing the CSS by setting transition-duration to 0s

The fix came down to one line, setting the transition duration to zero under reduced motion.

```diff
-    transition-duration: 0.01ms !important;
+    transition-duration: 0s !important;
```

The [CSS Transitions specification](https://www.w3.org/TR/css-transitions-1/#transition-duration-property) defines `0s` as the default transition duration. There was no additional transition delay on these position changes, so setting the duration to zero made the coordinate reset take effect immediately before measurement.

With the updated styles loaded, both the assistant selector and the account menu opened correctly. Checks passed with normal and reduced-motion settings, and the page had no additional scrollable area. The frontend production build also passed, and the fix was committed.

When an Ant Design dropdown fails to appear, especially if scrollbars flash, I would now check whether the popup exists and whether its coordinates make sense, then inspect `prefers-reduced-motion` and global transition rules. Everything had worked in local testing; the system preference was the condition I had missed.
