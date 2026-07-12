# AGENTS.md

## 项目概览

Boundless（无垠）是 Sanjeev 的中英双语个人博客，线上地址为
<https://sanjeev.top>，开源仓库为
<https://github.com/Sanjeever/boundless>。

项目基于 VitePress 2、Vue 3 和 TypeScript，使用 TDesign Vue Next 提供少量交互组件，
最终构建为静态站点并部署到 Cloudflare。不要把它当作带后端、数据库或独立 SPA
入口的应用。

## 目录与职责

- `docs/index.md`、`docs/archive.md`：中文首页与归档页。
- `docs/en/index.md`、`docs/en/archive.md`：英文首页与归档页。
- `docs/posts/<year>/*.md`：中文文章。
- `docs/en/posts/<year>/*.md`：英文文章；文件名和中文文章保持一致。
- `docs/{about,projects,albums}.md` 及 `docs/en/` 下的对应文件：双语固定页面。
- `docs/.vitepress/config/`：VitePress 共享配置及中英文导航、本地搜索文案。
- `docs/.vitepress/theme/`：默认主题扩展、全局样式、Vue 组件、文章数据加载、RSS
  与页面元数据逻辑。
- `docs/.vitepress/data/albums.json`：唱片墙的唯一数据源，中英文页面共用。
- `docs/public/`：不经过打包转换、按站点根路径访问的静态资源。
- `docs/assets/`：由 VitePress 处理的字体等源码资源。
- `.agents/skills/`：项目安装的 AI 技能；来源和版本记录在 `skills-lock.json`。
- `wrangler.toml`：Cloudflare 静态资源部署配置，产物目录为
  `docs/.vitepress/dist`。

## 常用命令

本项目使用 `pnpm`，不要混用 npm 或 Yarn，也不要手工修改 `pnpm-lock.yaml`。

```bash
pnpm install
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm format
pnpm format:check
pnpm update:deps
```

`pnpm test` 当前只是一个必然失败的占位脚本，不要把它当作有效测试。除非用户明确
要求，否则完成任务后不要主动运行构建、测试、类型检查或全仓库格式化。需要验证时，
选择与改动范围相称的最小命令；格式检查优先使用 `pnpm format:check <files...>`，避免
制造无关 diff。

## 内容维护约定

### 双语同步

- 中文根路径与 `/en/` 是同一站点的两个 locale。修改文章、导航、项目、关于页等
  面向读者的内容时，同步检查并更新另一语言版本。
- 新文章默认同时创建
  `docs/posts/<year>/<YYYY-MM-DD-slug>.md` 和
  `docs/en/posts/<year>/<YYYY-MM-DD-slug>.md`；两者文件名必须一致。只有用户明确要求
  单语内容时才例外。
- 不要直译专有名词、项目名、代码、命令或 URL；英文稿应自然表达，同时保留与中文稿
  相同的事实、链接和章节意图。

### 文章格式

文章使用以下 frontmatter 形状：

```yaml
---
title: 文章标题
date: YYYY-MM-DD
tags:
  - 标签
description: 一句话页面描述
outline: deep
aside: true
---
```

- 保留 `title`、`date`、`tags`、`description`、`outline`、`aside` 六个字段。日期也决定
  首页、归档和 RSS 的排序。
- frontmatter 后先写与 `title` 一致的一级标题。
- 首页摘要放在两个独立的 `<!-- DESC SEP -->` 标记之间。摘要应简短、自洽，并与
  `description` 含义一致。
- 中文和英文标签分别使用对应语言；两版标签的语义应一致。
- 站点启用了 clean URLs。内部链接优先写站点路径，不要添加 `.html`。
- 图片需要有有意义的替代文本。文章图片会被全局图片预览器接管，不要为同一需求再
  实现一套 lightbox。

### 唱片数据

- `albums.json` 中每项保持 `id`、`title`、`artist`、`cover` 四个字段，并同步更新顶层
  `updatedAt`。
- `id` 使用稳定、唯一的 kebab-case 标识；不要因展示文案调整而随意更改已有 ID。
- 封面使用 Cover Art Archive 的 release-group 地址：
  `https://coverartarchive.org/release-group/<MBID>/front-500`。先在 MusicBrainz 核对
  歌手、发行年份和 release group，避免只凭同名专辑猜测 MBID。

## 代码约定

- 遵循现有 VitePress 默认主题扩展方式，不复制或整体替换默认主题。全局注册组件放在
  `docs/.vitepress/theme/index.ts`，全局设计令牌和覆盖样式放在 `style.css`，页面专属
  样式尽量保持 scoped。
- TypeScript 配置开启 `strict`、`noUnusedLocals` 和 `verbatimModuleSyntax`。优先使用
  明确类型，类型导入使用 `import type`；不要用 `any` 绕过问题，除非第三方接口确实
  无可用类型且改动已严格局部化。
- VitePress 会执行 SSR。访问 `window`、`document`、`navigator` 或 `location` 的代码
  必须位于 `onMounted`、事件回调、`inBrowser`/`typeof window` 判断或 `ClientOnly` 中。
- TDesign 组件通过自动导入插件解析；Markdown 内嵌 Vue 代码若无法自动解析，应沿用
  现有页面的显式导入方式。新增组件库前先确认原生 Vue、VitePress 或现有 TDesign
  能否满足需求。
- 格式以 `.oxfmtrc.json` 为准：2 空格、单引号、无分号、80 列。不要顺手重排未修改
  的 Markdown、Vue 或 CSS。
- 保持 KISS，错误应明确暴露。不要添加默认假数据、静默降级、吞错重试或为未知旧环境
  准备的兼容分支。

## 视觉与交互

- 延续当前克制、阅读优先的编辑式风格，兼顾浅色和深色主题，不引入与现有博客割裂的
  “落地页模板”视觉。
- 优先复用 `--vp-*` 设计令牌和已有字体；TDesign 色彩已映射到 VitePress 品牌色。
- 页面设计尽量不用分隔线。仅在确实能改善信息层级或可读性时使用边框。
- 所有新界面同时检查桌面端和窄屏布局、键盘可用性、可见焦点、语义标签与替代文本。
- 动效应克制并服务于反馈或层级；只动画 `transform` 和 `opacity` 等低成本属性，并为
  非必要动效支持 `prefers-reduced-motion`。

## 构建与部署注意事项

- 构建结束会生成中文 `/feed.xml`、英文 `/feed-en.xml`、Sitemap，以及用于检测新部署的
  `/version.json`。这些都是生成物，不要提交 `docs/.vitepress/dist` 或手工编辑生成文件。
- RSS 当前各取对应语言最新 5 篇文章，SEO/OG 元数据来自 frontmatter 和
  `handleHeadMeta.ts`。修改文章元数据或内容加载器时，要同时考虑首页、归档、搜索、RSS
  和社交分享卡片。
- `shared.ts` 在 Node/构建环境运行，主题组件在 SSR 和浏览器两端运行；不要把仅浏览器
  可用的 API 引入构建钩子，也不要把 Node API 引入客户端组件。
- Giscus 代码目前保留但默认关闭。除非用户明确要求，不要自行启用评论或更改仓库、
  分类映射。

## 修改原则

- 先阅读将要修改的页面及其英文/中文对应文件，再做最小、局部的变更。
- 不提交缓存、构建产物、临时截图或本地工具状态，如 `node_modules/`、
  `docs/.vitepress/dist/`、`docs/.vitepress/cache/`、`.playwright-mcp/` 和 `tmp/`。
- 不修改与任务无关的格式、文案和依赖；不要覆盖用户已有的工作区改动。
- 需要提交信息时使用 Conventional Commits，例如
  `docs(posts): add bilingual article`、`feat(albums): add album covers`、
  `fix(theme): guard browser-only API during SSR`。
