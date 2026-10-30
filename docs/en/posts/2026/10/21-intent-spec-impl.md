---
title: Intent and Code
date: 2026-10-21
tags:
  - AI
  - Software Engineering
  - Vibe Coding
description: Using a simple report-export feature to look at Intent, Spec, and Impl—and where things slip through the cracks between an idea and working code.
outline: deep
aside: true
---

# Intent and Code

<!-- DESC SEP -->

Using a simple report-export feature to look at Intent, Spec, and Impl—and where things slip through the cracks between an idea and working code.

<!-- DESC SEP -->

Suppose you ask an AI agent to add an Export button to an admin report.

A minute later, the button is on screen and clicking it downloads an Excel file. Then you open the sheet and find only the 20 rows from the current page—when what you actually needed was to reconcile the entire month’s sales totals.

The code compiles and the button works, yet the feature misses the mark. Three old software engineering terms make it easy to see why: `Intent`, `Spec`, and `Impl`.

- **[Intent](https://dictionary.cambridge.org/dictionary/english/intent)** is the real-world job you want done: reconciling monthly sales without copying and pasting page by page.
- **[Spec (Specification)](https://dictionary.cambridge.org/dictionary/english/specification)** turns that goal into checkable rules: export every row matching the active filters, round currency to two decimal places, and make the bottom total match the summary header.
- **[Impl (Implementation)](https://dictionary.cambridge.org/us/dictionary/english/implementation)** is the code that makes it happen: reusing the filter query, bypassing pagination, and streaming the workbook back to the browser.

Building software is a journey along `Intent → Spec → Impl`.

## Two Arrows, Two Cracks

As [jyy’s Generative Software Engineering notes](https://jyywiki.cn/GSE/2026/lect1.md) point out, every arrow in that chain is an act of translation—and every translation can lose something along the way.

The first crack sits between `Intent` and `Spec`. If you want to reconcile monthly totals but only ask for “an export button,” data scope and rounding rules are left unspoken. Even if the code satisfies every word of your prompt, a single page of rows still leaves you stuck doing manual work.

The second crack sits between `Spec` and `Impl`. If the specification explicitly calls for “all matching rows,” yet the implementation reuses a paginated list endpoint out of habit, the bug lives in the code.

When a feature comes back wrong, figuring out *which* arrow bent is far more effective than telling the agent “still broken, try again.”

## Don’t Let the Model Fill In Product Blanks Silently

The magic of vibe coding is how fast an agent fills in blanks; the trap is that it fills them in without telling you.

Leave out the row scope, and it defaults to the current page. Say nothing about currency formatting, and it dumps raw floats. Each guess looks reasonable in isolation, until five quiet guesses add up to the wrong feature.

Taking thirty seconds to anchor both ends before the agent writes code pays off quickly:

1. **Share the real goal first**: “I need to reconcile monthly sales totals without paging through the table.”
2. **Ask for a short spec before code**: Following the spirit of [GitHub’s Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/), have the agent list the key behaviors, edge cases, and acceptance checks in a few lines first. Once those look right, let it write the code.

Before handing a task to a coding agent, three quick questions keep all three layers aligned:

> What real problem am I trying to solve?
> What has to be true for this to count as done?
> How will we verify it once the code is written?
