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

## 许可证

本仓库的所有代码与文章内容均采用 MIT License。
详见 [LICENSE](./LICENSE)。

## 致谢

本项目在搭建过程中参考并部分沿用了以下优秀开源项目的思路与实现，特此感谢：

- https://github.com/Justin3go/justin3go.com
