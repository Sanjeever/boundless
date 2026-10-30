---
title: 意图与代码
date: 2026-10-21
tags:
  - AI
  - 软件工程
  - Vibe Coding
description: 借一个报表导出的小例子聊聊 Intent、Spec 与 Impl，看想法变成代码的过程中偏差常从哪道缝隙钻出来。
outline: deep
aside: true
---

# 意图与代码

<!-- DESC SEP -->

借一个报表导出的小例子聊聊 Intent、Spec 与 Impl，看想法变成代码的过程中偏差常从哪道缝隙钻出来。

<!-- DESC SEP -->

假设你让 AI 给后台报表加个导出功能。

不到一分钟，按钮画好了，点一下也能下载出 Excel。可打开文件一看，里面只有当前页的 20 条记录——而你真正想做的，是在月底核对整个季度的销售总额。

代码能跑，界面也没破绽，结果却完全用不上。想把这类偏差理清楚，不妨借用软件工程里的三个词：`Intent`、`Spec` 和 `Impl`。

- **[Intent（意图）](https://dictionary.cambridge.org/dictionary/english/intent)** 是你心里真正想解决的事：月底把销售账对平，少干点一页页复制粘贴的苦力活。
- **[Spec（规格）](https://dictionary.cambridge.org/dictionary/english/specification)** 是把意图翻译成可检验的约定：导出当前筛选条件下的全部明细，金额保留两位小数，末尾合计必须与页面顶部的汇总一致。
- **[Impl（实现）](https://dictionary.cambridge.org/us/dictionary/english/implementation)** 则是落到代码里的具体做法：复用筛选查询、去掉分页限制、流式生成表格并返回下载。

软件成型的过程，就是沿着 `Intent → Spec → Impl` 一步步收窄的过程。

## 两个箭头，两道缝隙

[jyy 在《生成式软件工程》讲义](https://jyywiki.cn/GSE/2026/lect1.md)里聊过这三者之间的落差：每一个箭头都是一次翻译，只要是翻译，就会有遗漏和走样。

第一道缝隙在 `Intent → Spec`。如果你心里想的是“月底对账”，嘴上只说了句“加个导出按钮”，数据范围和金额精度就全成了空白。哪怕后面的代码写得滴水不漏，导出来的半截表格照样没法拿去对账。

第二道缝隙在 `Spec → Impl`。如果要求里明明写了“导出全部筛选结果”，代码却顺手复用了带默认分页的列表接口，那就是实现阶段掉链子了。

碰到结果不对劲时，先分清问题是出在“话没说透”还是“活没干对”，比对着聊天框连敲三遍“不对，再改改”管用得多。

## 别让 AI 替你做产品填空题

Vibe Coding 最迷人的地方是快，最容易踩坑的地方也是快。

你省掉半句背景，模型就会顺手替你做一道填空题：没提数据范围，它就默认只取当前页；没提小数精度，它就按浮点数原样输出。每一步自作主张看起来都挺顺理成章，攒在一起却偏离了你原本的意图。

所以把任务交给 AI 之前，花半分钟把两头定住很划算：

1. **先交底用途**：“我要在月底核对销售额，不想一页页翻着复制。”
2. **让它先列规格再写代码**：像 [GitHub Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) 提倡的那样，先让 AI 把边界条件和验收方式列成几条短句，你扫一眼确认没跑偏，再让它动手改代码。

下次给 Coding Agent 派活前，不妨先在心里过一遍这三句话：

> 我到底想解决什么麻烦？
> 改完之后看到什么才算完事？
> 拿什么测试或操作能一眼验出来？
