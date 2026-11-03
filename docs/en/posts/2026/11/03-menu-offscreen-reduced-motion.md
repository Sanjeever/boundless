---
title: Ant Design Dropdowns Not Showing over Windows Remote Desktop
date: 2026-11-03
tags:
  - CSS
  - Windows
  - Ant Design
  - Firefox
  - Troubleshooting
description: Clicking Ant Design dropdowns over Windows Remote Desktop only flashed the scrollbars, until tracing prefers-reduced-motion revealed how a 0.01ms global transition broke synchronous popup measurement.
outline: deep
aside: true
---

# Ant Design Dropdowns Not Showing over Windows Remote Desktop

<!-- DESC SEP -->

Clicking Ant Design dropdowns over Windows Remote Desktop only flashed the scrollbars, until tracing prefers-reduced-motion revealed how a 0.01ms global transition broke synchronous popup measurement.

<!-- DESC SEP -->

While developing Qizhihe on my own machine in Firefox, the interface had always behaved as expected.

After deploying the app to another Windows computer, I connected over Remote Desktop (RDP) and opened `http://localhost:8080` in Edge. Clicking the assistant selector at the top failed to open the dropdown. Instead, both the vertical and horizontal scrollbars flashed briefly and vanished. Clicking the account button in the bottom-left corner to sign out did the exact same thing: a quick flash of the scrollbars, and no menu in sight.

Switching to Chrome on that remote machine gave the same result. Yet back on my own computer, opening the exact same service over its LAN IP worked fine in both Firefox and Chrome.

| Access environment                       | Browser | Assistant selector and account menu      |
| ---------------------------------------- | ------- | ---------------------------------------- |
| Remote Windows desktop                   | Edge    | Scrollbars flashed; menus did not appear |
| Remote Windows desktop                   | Chrome  | Same issue                               |
| Local machine accessing the same service | Firefox | Worked                                   |
| Local machine accessing the same service | Chrome  | Worked                                   |

Seeing Chrome fail on one machine and succeed on another ruled out a simple browser compatibility bug. Something about the remote Windows environment was changing how the page behaved.

The flashing scrollbars offered a second clue. The assistant selector used [Ant Design](https://ant.design/) `Select`, and the account menu used `Dropdown`. Both components mount a floating popup into the document when clicked. If the page briefly grew scrollbars, the popup was likely being rendered into the DOM, just far outside the visible viewport.

## Disabled window animations and 0.01ms

I paired up with Codex to inspect the remote machine's settings alongside the frontend code.

On the remote computer, `MinAnimate` was set to `0` in the current user's registry, meaning Windows window animations were turned off. In Windows 11, this corresponds to **Settings → Accessibility → Visual effects → Animation effects**, a toggle that Remote Desktop sessions and performance presets often disable.

A registry value alone does not tell you what the browser sees. The quickest way to check whether the page itself has entered reduced-motion mode is to press `F12` and evaluate [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) in the console across Firefox, Edge, or Chrome:

```js
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

The browsers inside the remote session returned `true`, while the browsers on my local machine returned `false`.

Searching the project's stylesheets for that media query turned up a global rule:

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

This snippet is a common pattern from modern CSS resets. It shrinks animation and transition durations down to `0.01ms` so visual motion disappears while `transitionend` and `animationend` events still fire.

To the human eye, `0.01ms` is instantaneous. To the browser's layout and transition engine, it is still greater than zero.

## Popups stranded at (-16000, -9000)

How does a `0.01ms` transition make a dropdown disappear?

After clicking the selector, you can locate `.ant-select-dropdown` or `.ant-dropdown` in DevTools and read its position relative to the viewport with [`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect):

```js
document.querySelector('.ant-select-dropdown')?.getBoundingClientRect()
```

Comparing normal mode against reduced-motion mode in a `1600 × 900` viewport made the failure obvious:

- Under normal settings, the assistant menu landed at `(222, 132)`, right below the trigger button.
- With `prefers-reduced-motion: reduce` active, the same menu sat at `(-16000, -9000)`, and the account menu was stranded offscreen in the same way.

Those `(-16000, -9000)` coordinates are ten times the `1600 × 900` viewport dimensions in the negative direction. The popup was sitting in the DOM the whole time, parked far beyond the top-left corner of the screen, and the brief coordinate shift during alignment was what made the scrollbars flash.

The project was running `antd 6.6.3` with `@rc-component/trigger 3.10.1`. Before aligning a popup, `trigger` parks the element far offscreen, temporarily resets its coordinates to zero to measure its natural box, and then calculates the final offset next to the button. Inside `useAlign`, that measurement step comes down to three lines:

```js
popupElement.style.left = '0'
popupElement.style.top = '0'
const popupRect = popupElement.getBoundingClientRect()
```

This sequence assumes that writing `'0'` to `left` and `top` takes effect immediately, so the synchronous `getBoundingClientRect()` call on the next line reads the reset position.

With `* { transition-duration: 0.01ms !important }` active and `transition-property` defaulting to `all`, changes to `left` and `top` are also forced through a CSS transition.

When `left` and `top` are overwritten from their offscreen coordinates to `'0'`, a `0.01ms` transition begins. Measuring synchronously on the very same frame in Chromium still returns the starting coordinates of that transition. `useAlign` then computes the popup's alignment from the offscreen starting point, leaving the menu stuck at `(-16000, -9000)`.

The same mechanism was reported in [react-component/trigger issue #618](https://github.com/react-component/trigger/issues/618) against antd 5 and an earlier `trigger` release, and it reproduces the same way in antd 6.

## Setting transition-duration back to 0s

Once the cause was clear, the fix was a single line setting the reduced-motion transition duration to `0s`:

```diff
-    transition-duration: 0.01ms !important;
+    transition-duration: 0s !important;
```

In the [CSS Transitions specification](https://www.w3.org/TR/css-transitions-1/#transition-duration-property), `0s` is the initial default for `transition-duration`. With no transition delay present, a zero duration prevents any transition from starting, so resetting `left` and `top` updates the element's geometry immediately before measurement.

With the updated stylesheet loaded, both the assistant selector and the account menu opened right where they belonged under both normal and reduced-motion settings, without a single scrollbar flash.
