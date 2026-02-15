---
title: Boyer-Moore：从右往左更快的字符串匹配
date: 2026-02-17
tags:
  - 算法
  - 字符串
  - Java
  - 编程
description: 把“查找子串”想成在长文本里找一个单词，Boyer-Moore 用“从右往左比对 + 大步跳跃”的直觉，让匹配速度明显提升。
outline: deep
aside: true
---

# Boyer-Moore：从右往左更快的字符串匹配

<!-- DESC SEP -->

把“查找子串”想成在长文本里找一个单词，Boyer-Moore 用“从右往左比对 + 大步跳跃”的直觉，让匹配速度明显提升。

<!-- DESC SEP -->

## 先用一句话理解它

在长文本里找一个单词。Boyer-Moore 的秘诀是：**从右往左比对，发现不匹配就一次跳很远**。

## 先看最朴素的办法（为什么慢）

最简单的方法是从左往右逐字符比对：不匹配就右移一格，再从头开始比。它能找到答案，但经常做很多重复比较。

::: tip 关键直觉
既然已经看到了“某些位置不可能匹配”，就别只挪 1 格了，直接跳过。
:::

## Boyer-Moore 的核心原理（记住 3 句话）

1. **从右往左比**：先看模式串的最后一位。
2. **遇到错字母就大跳**：根据“坏字符规则”决定至少跳多远。
3. **右边对上了还不行时再用好后缀**：保证跳了也不会错过真正的答案。

## 手把手走一轮

我们在文本里找 `EXAMPLE`：

```text
TEXT:    HERE IS A SIMPLE EXAMPLE
PATTERN:          EXAMPLE
```

从右往左比，发现某一位不匹配。此时有两个事实：

- 当前错字母在模式串里出现的位置，决定了“最小安全跳步”。
- 如果右侧已经匹配了一段后缀，就尝试把这段后缀对齐到模式串中别的位置。

::: info 把它当成两张“跳步表”
坏字符表告诉你：看到某个错字母至少该跳多少。
好后缀表告诉你：右边已经对上的那段，下一次应该对齐到哪里。
:::

::: details 这两条规则为什么安全
- **坏字符规则**：如果错字母在模式串里最右出现的位置还在当前对齐左侧，那就把它对齐到那一位；如果根本没出现，就整段跳过。
- **好后缀规则**：右侧已经对上时，下一次要么让这段后缀对齐到模式串里另一次出现的位置，要么对齐到模式串的前缀。
:::

## 实现：Java 与 JavaScript

下面是可直接运行的 Java 与 JavaScript 版本（返回首次匹配位置）。可以按“先准备，再搜索”的顺序理解：

### 编码思路（先准备，再搜索）

1. **处理边界**：空模式串直接返回 0；模式串比文本长直接返回 -1。
2. **坏字符表（bmBc）**：为每个字符记录“如果它是错字母，至少要跳多少”。
3. **后缀数组（suff）**：记录“从 i 往右的后缀能和模式串末尾对齐多长”。
4. **好后缀表（bmGs）**：根据 `suff` 算出“右侧对上时，下一步跳多远”。
5. **搜索循环**：从右往左比，错了就取两种跳步的最大值。

把代码理解成两段就够了：**前半段是“做两张跳步表”，后半段才是“真正搜索”**。

::: tip 如果想自己手写
先实现“坏字符表 + 搜索循环”，能跑通后再加入好后缀表，这样更容易调试。
:::

::: code-group

```java [Java 版本]
public static int boyerMooreSearch(String text, String pattern) {
    int n = text.length();
    int m = pattern.length();
    if (m == 0) return 0;
    if (m > n) return -1;

    int[] bmBc = new int[256];
    for (int i = 0; i < 256; i++) bmBc[i] = m;
    for (int i = 0; i < m - 1; i++) {
        bmBc[pattern.charAt(i) & 0xFF] = m - 1 - i;
    }

    int[] suff = new int[m];
    suff[m - 1] = m;
    int f = 0, g = m - 1;
    for (int i = m - 2; i >= 0; --i) {
        if (i > g && suff[i + m - 1 - f] < i - g) {
            suff[i] = suff[i + m - 1 - f];
        } else {
            if (i < g) g = i;
            f = i;
            while (g >= 0 && pattern.charAt(g) == pattern.charAt(g + m - 1 - f)) g--;
            suff[i] = f - g;
        }
    }

    int[] bmGs = new int[m];
    for (int i = 0; i < m; i++) bmGs[i] = m;

    int j = 0;
    for (int i = m - 1; i >= 0; i--) {
        if (suff[i] == i + 1) {
            for (; j < m - 1 - i; j++) {
                if (bmGs[j] == m) bmGs[j] = m - 1 - i;
            }
        }
    }
    for (int i = 0; i <= m - 2; i++) {
        bmGs[m - 1 - suff[i]] = m - 1 - i;
    }

    int s = 0;
    while (s <= n - m) {
        int i = m - 1;
        while (i >= 0 && pattern.charAt(i) == text.charAt(s + i)) i--;
        if (i < 0) {
            return s;
        } else {
            int bcShift = bmBc[text.charAt(s + i) & 0xFF] - m + 1 + i;
            int gsShift = bmGs[i];
            s += Math.max(bcShift, gsShift);
        }
    }
    return -1;
}
```

```javascript [JavaScript 版本]
function boyerMooreSearch(text, pattern) {
  const n = text.length;
  const m = pattern.length;
  if (m === 0) return 0;
  if (m > n) return -1;

  const bmBc = new Array(256).fill(m);
  for (let i = 0; i < m - 1; i++) {
    bmBc[pattern.charCodeAt(i) & 0xff] = m - 1 - i;
  }

  const suff = new Array(m);
  suff[m - 1] = m;
  let f = 0;
  let g = m - 1;
  for (let i = m - 2; i >= 0; --i) {
    if (i > g && suff[i + m - 1 - f] < i - g) {
      suff[i] = suff[i + m - 1 - f];
    } else {
      if (i < g) g = i;
      f = i;
      while (g >= 0 && pattern.charCodeAt(g) === pattern.charCodeAt(g + m - 1 - f)) g--;
      suff[i] = f - g;
    }
  }

  const bmGs = new Array(m).fill(m);
  let j = 0;
  for (let i = m - 1; i >= 0; i--) {
    if (suff[i] === i + 1) {
      for (; j < m - 1 - i; j++) {
        if (bmGs[j] === m) bmGs[j] = m - 1 - i;
      }
    }
  }
  for (let i = 0; i <= m - 2; i++) {
    bmGs[m - 1 - suff[i]] = m - 1 - i;
  }

  let s = 0;
  while (s <= n - m) {
    let i = m - 1;
    while (i >= 0 && pattern.charCodeAt(i) === text.charCodeAt(s + i)) i--;
    if (i < 0) {
      return s;
    } else {
      const bcShift = bmBc[text.charCodeAt(s + i) & 0xff] - m + 1 + i;
      const gsShift = bmGs[i];
      s += Math.max(bcShift, gsShift);
    }
  }
  return -1;
}
```

```text [思路速记]
1. 预处理坏字符表：遇到错字母，决定至少跳多远
2. 预处理好后缀表：右边对上了，左边没对上时怎么移动
3. 从右往左比较，按两种规则取最大步长
```

:::

::: warning 字符集提醒
坏字符表用了 256 大小的数组，适合 ASCII。若文本可能包含更广泛的 Unicode 字符，应改用更大的表或 Map。
:::

## 复杂度与适用场景

- 预处理复杂度为 $O(m)$，搜索平均表现接近 $O(n)$。
- 最坏情况仍可能退化为 $O(nm)$，但在真实文本中通常非常快。
- 当模式串较长、文本较大时，Boyer-Moore 往往比朴素匹配更划算。

## 小结

Boyer-Moore 的“反直觉”在于它不执着于逐位前进，而是利用已经看到的信息大胆跳跃。只要记住“从右往左 + 遇错就跳”，你就已经掌握了它的精髓。
