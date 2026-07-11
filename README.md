# 无垠（Boundless）博客

一个基于 VitePress 的简洁、现代、功能完备的个人博客，用于记录与分享。

## 功能特性

- 深色/浅色主题切换，舒适阅读
- 文章摘要与标签，便捷浏览
- 中英双语站点与归档页
- RSS 订阅（中文与英文）
- 高清图片预览
- 自定义字体与基础 SEO（含 Sitemap、OG/Twitter Cards）
- 评论系统支持 Giscus（当前默认关闭）

## 快速开始

```bash
git clone https://github.com/Sanjeever/boundless.git
cd boundless

npm i -g pnpm
pnpm i
pnpm docs:dev
```

## 构建与部署

```bash
pnpm docs:build
```

将 `docs/.vitepress/dist` 目录部署到任意静态站点托管服务（Cloudflare Pages、Vercel、Netlify 等）。

## 目录说明

- `docs/` 内容根目录（包含中文与英文站点）
- `docs/.vitepress/` 站点配置与主题代码
- `docs/posts/**` 与 `docs/en/posts/**` 博客文章目录

## AI 技能

项目已在 `.agents/skills/` 安装以下技能；安装来源与版本校验信息记录在 `skills-lock.json`。可以在向 AI 助手提出任务时直接描述需求，或点名技能名称。

### 营销文案

来源：[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)

| 技能 | 用途 | 用例 |
| --- | --- | --- |
| `copywriting` | 为首页、落地页、定价页、功能页等从头撰写以转化为目标的营销文案，强调清晰、具体的用户价值和行动引导。 | “使用 `copywriting` 为这个博客的订阅页写首屏文案：面向想持续阅读技术随笔的开发者，主 CTA 是订阅 RSS。” |
| `copy-editing` | 在不改变核心信息和作者声音的前提下，系统审校已有营销文案；可按清晰度、语气、利益点、证据、具体性、情绪和行动阻力等维度逐轮优化。 | “使用 `copy-editing` 润色这段中文首页介绍，指出每处修改的原因，并保留克制、个人化的语气。” |

### 前端视觉设计

来源：[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)

| 技能 | 用途 | 用例 |
| --- | --- | --- |
| `design-taste-frontend` | 面向落地页、作品集和网站改版的设计与实现指引，先理解需求和现有设计，再选择合适的版式、字体、色彩与组件，避免模板化界面。 | “使用 `design-taste-frontend` 为博客新增一页作品集：先审视现有 VitePress 主题，再给出与现有站点协调的页面方案。” |
| `gpt-taste` | 为需要强视觉叙事和滚动动效的展示页提供 AIDA 信息结构、宽幅编辑式排版、紧凑的 bento 布局及 GSAP ScrollTrigger 动效规范。 | “使用 `gpt-taste` 设计一页年度文章回顾专题：用滚动堆叠展示季度主题，并确保标题不会出现狭窄的多行断句。” |
| `high-end-visual-design` | 以高端数字工作室的标准规划视觉层级、留白、材质感、卡片、阴影与微交互，避免常见的廉价或同质化 UI 模式。 | “使用 `high-end-visual-design` 重做站点的 About 页面：保留内容结构，但提升排版、照片呈现和交互质感。” |
| `minimalist-ui` | 构建温暖单色、编辑感强的极简界面；使用排版对比、扁平 bento 网格和低饱和点缀色，避免渐变与厚重阴影。 | “使用 `minimalist-ui` 设计文章归档页：采用暖白背景、清晰的年份层级和低饱和标签，不使用渐变。” |
| `redesign-existing-projects` | 在不迁移技术栈、不破坏既有功能的前提下，审计现有网站的字体、色彩、布局、可访问性和交互状态，并做可审查的针对性改造。 | “使用 `redesign-existing-projects` 审查当前博客主题，列出最影响品质的五项问题，并只实施低风险的视觉改进。” |

## 许可证

本仓库的所有代码与文章内容均采用 MIT License。
详见 [LICENSE](./LICENSE)。

## 致谢

本项目在搭建过程中参考并部分沿用了以下优秀开源项目的思路与实现，特此感谢：

- https://github.com/Justin3go/justin3go.com
