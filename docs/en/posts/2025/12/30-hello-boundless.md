---
title: Hello, Boundless
date: 2025-12-30
tags:
  - Essay
description: Welcome to Boundless, a new blog powered by VitePress.
outline: deep
aside: true
---

# Hello, Boundless

<!-- DESC SEP -->

This is my new blog. Here I record learning, writing, and thinking.

<!-- DESC SEP -->

## Getting Started

::: tip Tip
This site is powered by VitePress and enhanced by a custom theme to improve the reading experience.
:::

::: info Info
The following showcases common interactions and Markdown enhancements available within an article.
:::

::: warning Warning
Some features depend on site configuration and plugins; refer to the actual build result.
:::

## Image Preview

![Green Hair Water Monster](/public/2025/12/GreenHairWaterMonster.jpg)

## Code Groups

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

## Code Highlighting and Line Annotations

```ts {1,3}
export function hello(name: string) {
  // [!code highlight]
  return `Hello, ${name}!`
}
```

```ts
export function sum(a: number, b: number) {
  if (Number.isNaN(a) || Number.isNaN(b)) {
    // [!code warning] Input must be numeric
    return 0
  }
  return a + b
}
```

## Math Formulas

Inline formula example: $E = mc^2$

Block formula example:

$$
\mathrm{P}(X=k) = \binom{n}{k}\, p^k (1-p)^{n-k}
$$

## Built-in Components and Interactions

<Badge type="tip" text="New" />

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<div style="margin: 8px 0;">
  <button
    style="padding:6px 10px;border:1px solid var(--vp-c-divider);border-radius:6px;background:var(--vp-c-bg-soft);"
    @click="count++"
  >
    Click count: {{ count }}
  </button>
</div>

## Collapsible Details

::: details Expand to view
This is collapsible content for supplemental notes, citations, and further reading links.
:::
