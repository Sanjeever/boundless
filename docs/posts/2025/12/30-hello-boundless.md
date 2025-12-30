---
title: 你好，无垠
date: 2025-12-30
tags:
  - 随笔
description: 欢迎来到无垠（Boundless），这是一个基于 VitePress 的新博客。
outline: deep
aside: true
---

# 你好，无垠

<!-- DESC SEP -->

这是我的新博客。这里记录学习、写作与思考。

<!-- DESC SEP -->

## 起步

::: tip 提示
本站由 VitePress 驱动，并通过自定义主题增强文章体验。
:::

::: info 说明
以下内容展示文章内可用的常见交互与 Markdown 增强能力。
:::

::: warning 注意
部分能力依赖站点配置与插件，请以实际构建结果为准。
:::

## 图片预览

![Green Hair Water Monster](/public/2025/12/GreenHairWaterMonster.jpg)

## 代码分组

::: code-group

```bash [npm]
npm run docs:dev
```

```bash [pnpm]
pnpm docs:dev
```

```bash [yarn]
yarn docs:dev
```

:::

## 代码高亮与行标注

```ts {1,3}
export function hello(name: string) {
  // [!code highlight]
  return `你好，${name}！`
}
```

```ts
export function sum(a: number, b: number) {
  if (Number.isNaN(a) || Number.isNaN(b)) {
    // [!code warning] 输入必须为数字
    return 0
  }
  return a + b
}
```

## 数学公式

行内公式示例：$E = mc^2$

块级公式示例：

$$
\mathrm{P}(X=k) = \binom{n}{k}\, p^k (1-p)^{n-k}
$$

## 内置组件与交互

<Badge type="tip" text="新" />

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<div style="margin: 8px 0;">
  <button
    style="padding:6px 10px;border:1px solid var(--vp-c-divider);border-radius:6px;background:var(--vp-c-bg-soft);"
    @click="count++"
  >
    点击计数：{{ count }}
  </button>
</div>

## 可折叠详情

::: details 展开查看
这是折叠内容，可用于放置补充说明、引用与扩展阅读链接。
:::
