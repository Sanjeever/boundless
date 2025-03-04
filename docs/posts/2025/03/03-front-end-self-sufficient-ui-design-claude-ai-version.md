---
title: 前端自给自足UI设计稿（Claude AI 版本）
date: 2025-03-03
tags:
  - AI
  - Claude
  - UI/UX
  - 设计
  - Tailwind
  - HTML
  - Artifacts
  - GPT-4o
  - DeepSeek
---
# 前端自给自足UI设计稿（Claude AI 版本）

> ✨文章摘要（AI生成）

<!-- DESC SEP -->

笔者最近探索了如何借助 AI（特别是 Claude）来协助前端开发者完成 UI 设计工作。通过实践发现，Claude 在这方面表现出色，能够快速生成符合现代设计趋势的界面设计。

在这篇文章中，我以一个健康类 APP 为例，演示了如何通过简单的提示词引导 AI 完成设计工作。整个过程分为几个核心模块：**首页概览**、**运动计划**、**饮食管理**以及**社区功能**。通过分模块设计的方式，不仅避免了 AI 模型的输出限制问题，还能让设计更加聚焦和精细。

为了提高效率和可用性，我在提示词中特别强调了以下几点：
- 使用 Tailwind CSS（CDN方式）实现样式
- 采用 Lucide Static CDN 处理图标
- 将相关页面整合在同一个 HTML 文件中

通过对比测试，目前 Claude（特别是 3.5 版本）在该场景下的表现最为稳定。而 GPT-4o 和 DeepSeek 等其他模型在完成类似任务时还存在一定差距。

<!-- DESC SEP -->

## 先看效果

### 健康类 APP

输入：健康类 APP

> AI 开始思考并设计功能，以及统一设计风格；然后调用可视化插件进行 HTML 的预览（这些步骤你也可以在 Cursor 等编辑器完成，然后直接预览 HTML 即可）

效果如下：

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145429.png)

> 然后，AI 继续问我是否继续，继续哪一个模块。

输入：继续【运动计划模块】

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145552.png)

同样，输入：继续【饮食管理模块】

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145940.png)

最后，输入：继续【社区功能】

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150626.png)

### 播客类 APP

> 输入播客类 APP，然后一直继续下去就可以了，效果如下：

![](https://oss.justin3go.com/blogs/20250304155943507.png)

![](https://oss.justin3go.com/blogs/20250304160130247.png)

![](https://oss.justin3go.com/blogs/20250304160202306.png)

![](https://oss.justin3go.com/blogs/20250304160231953.png)

![](https://oss.justin3go.com/blogs/20250304160254854.png)

![](https://oss.justin3go.com/blogs/20250304160309438.png)

### 类似推特的 APP

> 输入推特类 APP，然后一直继续下去就可以了，效果如下：

![](https://oss.justin3go.com/blogs/20250304160402030.png)

![](https://oss.justin3go.com/blogs/20250304160418750.png)

![](https://oss.justin3go.com/blogs/20250304160436182.png)

![](https://oss.justin3go.com/blogs/20250304160451704.png)

![](https://oss.justin3go.com/blogs/20250304160513726.png)

## 提示词如下

```
## 你是谁

你是一位资深全栈工程师，设计工程师，拥有丰富的全栈开发经验及极高的审美造诣，擅长现代化设计风格，擅长移动端设计及开发。

## 你要做什么

1. 用户将提出一个【APP 需求】
2. 设计这个【APP 需求】，模拟产品经理提出需求和信息架构，请自己构思好功能需求和界面

> 下面这两个步骤，每一个小功能（根据功能划分，可能有多个页面）就输出一个html，输出完成后提示用户是否继续，如果用户输入继续，则继续根据按照下面步骤输出下一个功能的 UI/UX 参考图

3. 然后使用 html + tailwindcss 设计 UI/UX 参考图
4. 调用【Artifacts】插件可视化预览该 UI/UX 图（可视化你编写的 html 代码）

## 要求

- 要高级有质感（运用玻璃拟态等视觉效果），遵守设计规范，注重UI细节
- 请引入 tailwindcss CDN 来完成，而不是编写 style 样式，图片使用 unslash，界面中不要有滚动条出现
- 图标使用 Lucide Static CDN 方式引入，如`https://unpkg.com/lucide-static@latest/icons/XXX.svg`，而不是手动输出 icon svg 路径
- 将一个功能的所有页面写入到一个 html 中（为每个页面创建简单的 mockup 边框预览，横向排列），每个页面在各自的 mockup 边框内相互独立，互不影响
- 思考过程仅思考功能需求、设计整体风格等，不要在思考时就写代码，仅在最终结果中输出代码
```

基本思路：

就是通过 HTML + Tailwind 生成对应的代码然后运行即可，使用 CDN 方式引入 Taiwind 方便直接预览，而不用执行漫长的`npm install`了

一些小技巧：

- 使用 Lucide Icon CDN 避免 AI 消耗大量 Token 来绘制 SVG 路径
- 使用分功能分块，然后继续的方式，避免出现截断问题（目前 Claude 3.7 截断问题非常严重，所以暂时使用 Claude 3.5 替代，效果也还不错）
- 提前想好功以及整体设计风格，方便后续分功能设计页面时进行参考

## 其他模型呢

2025-03-03 尝试的，其他模型效果大部分都不行，Claude 3.7 效果还行，但经常被截断，不够稳定，可以观望一下。

其他模型仅仅尝试过两个非推理模型，大家可以自行尝试。

### GPT-4o

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150737.png)

### DeepSeek

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150817.png)

## 参考

参考自如下两位博主的思路分享

- [Cursor 让普通人也能轻松设计一套 APP 精美 UI 2.0 版本](https://x.com/huangzh65903362/status/1895991413881651504)
- [你好，我是「今天又是被取代的一天」服务，这是我 300 秒做的 UI/UX 设计（我是 claude3.7 thinking btw](https://x.com/fengbuyou/status/1894801574716940616)