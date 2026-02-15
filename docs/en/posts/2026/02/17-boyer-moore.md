---
title: "Boyer-Moore: Faster String Search from Right to Left"
date: 2026-02-17
tags:
  - Algorithm
  - String
  - Java
  - JavaScript
  - Programming
description: Think of substring search as finding a word in a long text. Boyer-Moore compares from the right and jumps far when it fails, which makes it fast in practice.
outline: deep
aside: true
---

# Boyer-Moore: Faster String Search from Right to Left

<!-- DESC SEP -->

Think of substring search as finding a word in a long text. Boyer-Moore compares from the right and jumps far when it fails, which makes it fast in practice.

<!-- DESC SEP -->

## Understand it in one sentence

Boyer-Moore searches a pattern in text by comparing from right to left and skipping ahead when a mismatch appears.

## The simplest approach (why it is slow)

The most direct method compares from left to right. On a mismatch, it shifts the pattern by one and starts over. It works, but it repeats lots of comparisons.

::: tip Key intuition
If you already know a position cannot match, do not move just one step. Jump.
:::

## The core idea in 3 sentences

1. **Compare from the right**: start with the last character of the pattern.
2. **On a mismatch, jump far**: the bad-character rule gives a safe minimum jump.
3. **If the right side matched, jump safely**: the good-suffix rule avoids missing valid matches.

## Walk through one round

We search for `EXAMPLE` in this text:

```text
TEXT:    HERE IS A SIMPLE EXAMPLE
PATTERN:          EXAMPLE
```

We compare from the right and hit a mismatch. Two facts help us jump:

- The mismatching character tells us how far we can safely move the pattern.
- If the right side already matched, we try to align that suffix with another place in the pattern.

::: info Think of two "jump tables"
The bad-character table tells you how far to jump for a wrong character.
The good-suffix table tells you where to align a matched suffix next.
:::

::: details Why both rules are safe
- **Bad-character rule**: if the wrong character appears in the pattern, align it with its rightmost occurrence; if it never appears, skip the whole pattern length.
- **Good-suffix rule**: if the right side matches, align that suffix with another occurrence or with a prefix of the pattern.
:::

## Implementation: Java and JavaScript

Below are runnable Java and JavaScript versions (returning the first match index). Read them as "prepare tables first, then search".

### Coding plan (prepare, then search)

1. **Handle edges**: empty pattern returns 0, longer pattern returns -1.
2. **Bad-character table (bmBc)**: for each character, store the minimum jump on mismatch.
3. **Suffix array (suff)**: how long a suffix starting at `i` matches the pattern end.
4. **Good-suffix table (bmGs)**: based on `suff`, compute safe jumps when the right side matched.
5. **Search loop**: compare right to left, then jump by the larger rule.

Think of the code in two halves: **build the jump tables, then run the search**.

::: tip If you want to implement it yourself
Start with the bad-character table and the search loop. After that works, add the good-suffix table.
:::

::: code-group

```java [Java]
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

```javascript [JavaScript]
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

```text [Quick checklist]
1. Build the bad-character table
2. Build the good-suffix table
3. Compare from right to left, jump by the larger shift
```

:::

::: warning Character set note
The bad-character table uses a size-256 array, which is fine for ASCII. For wider Unicode text, use a larger table or a map.
:::

## Complexity and when to use it

- Preprocessing is $O(m)$ and searching is close to $O(n)$ on average.
- Worst case can be $O(nm)$, but it is usually fast on real-world text.
- It shines when the pattern is longer and the text is large.

## Summary

Boyer-Moore feels "backwards" because it starts from the right, but that is exactly why it can skip so much. Remember: compare from the right and jump on mismatches.
