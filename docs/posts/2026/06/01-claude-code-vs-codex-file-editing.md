---
title: Codex 与 Claude Code 的文件编辑
date: 2026-06-01
tags:
  - 随笔
  - AI
  - 编程
  - 工具
description: Codex 用补丁描述修改，Claude Code 用精确文本替换，两种文件编辑模型在定位上下文与失败方式上各有取舍。
outline: deep
aside: true
---

# Codex 与 Claude Code 的文件编辑

<!-- DESC SEP -->

Codex 用补丁描述修改，Claude Code 用精确文本替换，两种文件编辑模型在定位上下文与失败方式上各有取舍。

<!-- DESC SEP -->

表面上看，Claude Code 和 Codex 做的事情差不多：读代码、改代码、跑命令。但细看它们落盘修改的那一步，两边走了不同的路：Codex 用补丁描述变更，Claude Code 则用精确文本替换或整文件写入。

## Codex：补丁思维

Codex 的核心编辑工具是 `apply_patch`，接收一段类似 unified diff 的补丁文本，用来新增、删除、更新或移动文件。OpenAI 的 [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) 里给出了它的典型格式：

```text
*** Begin Patch
*** Update File: path/to/file.ext
@@
-旧内容
+新内容
*** End Patch
```

这种写法离 Git diff 很近。删了哪几行、加了哪几行，在工具调用里一眼就能看清；一次顺手改动多个文件，或者在改代码的同时重命名文件，也都能装进同一份补丁里。

代价是补丁对上下文很敏感。如果提供的上下文太短，在相似代码扎堆的文件里就会找不准位置；要是遇到中文字符、Tab 混排或换行符差异，补丁也容易因为对不上原文件而报错。这时候 Codex 往往得先退回去跑一轮 `rg` 或读取命令，看清原貌后再重新打补丁。

## Claude Code：编辑器思维

Claude Code 把“局部修改”和“完整写入”拆成了两个工具：`Edit` 和 `Write`。

`Edit` 做的是精确字符串替换——传入文件路径、`old_string` 和 `new_string`。只要 `old_string` 在文件里唯一，并且连缩进、空格和换行都分毫不差，替换就会干脆地完成。[官方工具参考](https://code.claude.com/docs/en/tools-reference#edit-tool-behavior)里也围绕这种匹配与唯一性设计了先读后改的约束。

这种模型很像人在编辑器里按下查找替换。它逼着模型在动手前先把文件读准，不能凭印象瞎猜。

但它的脾气也很直：只要多一个空格、少一个换行，或者同一段代码在文件里出现了两次而没有显式开启 `replace_all`，调用就会直接被打回。至于新建文件或推倒重写，则交给 `Write` 整篇落盘。

## 两种路径的分岔

把这两种方式放在一起看，差异主要在四个地方：

1. **可读性**：`apply_patch` 天生像代码审查时看的 diff；`Edit` 则像一条编辑器指令，重点是“把这段字换成那段字”。
2. **多文件改动**：跨几个文件做零星增删时，一份 patch 就能串起来；`Edit` 更习惯一个文件、一个位置地挨个处理。
3. **失败方式**：patch 常败在上下文太短或定位漂移；`Edit` 常败在 `old_string` 不唯一或空白字符没对齐。
4. **重写大文件**：`Write` 覆盖整篇文件最省事，但也最容易在不知不觉间抹掉旁人的改动。

## 工具之外的纪律

说到底，工具形状只是第一道栅栏。

补丁写得再漂亮，也照样能一口气重写大半个文件；`Edit` 匹配得再严格，选错了目标函数也一样会改坏逻辑。

真正决定代码干不干净的，还是工具背后的那套手艺：动手前先读上下文，只改与问题有关的那几行，不顺手重排格式，改完之后老老实实看一眼 `git diff`。
