<h4 align="right"><a href="./README.md">English</a> | <strong>简体中文</strong> </h4>

<div align="center">

<a href="#" target="blank">
  <img src="./images/demo.png" height="100px" alt="logo"/>
</a>

# 无垠 Boundless

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![VitePress](https://img.shields.io/badge/VitePress-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Vue-3](https://img.shields.io/badge/Vue-3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)
![TDesign](https://img.shields.io/badge/TDesign-0052CC?style=for-the-badge&logo=tdesign&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Giscus](https://img.shields.io/badge/Giscus-181717?style=for-the-badge&logo=github&logoColor=white)
![Support RSS](https://img.shields.io/badge/Support%20RSS-FFA500?style=for-the-badge&logo=rss&logoColor=white)
![Support I18N](https://img.shields.io/badge/Support%20I18N-0078D4?style=for-the-badge&logo=google-translate&logoColor=white)
![SEO](https://img.shields.io/badge/SEO-4285F4?style=for-the-badge&logo=google&logoColor=white)

一款功能齐全的、现代化的、简洁优雅的静态博客，基于 vitepress；主要记录✍️我的博客、笔记。

每周末/周六如有更新 release 一次，文章发布以及网站修改会记录在 release 中，欢迎 star/watch(custom->release)关注最新动态~

[![changelog](https://img.shields.io/badge/changelog-→-0052CC?style=for-the-badge&logo=ReSharper&logoColor=white)](./CHANGELOG.md)


<!-- 仓库链接在个性化过程中移除 -->

![demo](./images/demo.png)

</div>

## 功能特性

1. 🌓 提供明暗模式切换功能，适应不同的阅读环境。
2. 📖 支持博客分页、摘要、标签功能，方便用户查看。
3. 🌍 支持中英双语界面，方便不同语言用户的使用。
4. 📡 提供 RSS 订阅功能，支持中英文内容更新推送。
5. 💬 集成 Giscus 评论系统，便于用户交流和反馈。
6. 🖼️ 支持高清大图预览，优化视觉体验。
7. 📜 允许自定义字体设置，提升阅读舒适度。
8. 🔍 进行 SEO 优化，包括 Sitemap 生成、Twitter Card 和 Open Graph 标签支持，提高搜索引擎可见性。

## 开发

```bash
git clone <你的仓库地址>
cd <你的项目文件夹>

npm i -g pnpm # 如果需要
pnpm i
pnpm docs:dev
```
1. 修改 giscus 评论配置，`.vitepress/theme/components/Comments.vue`中的`giscus`配置项;
2. 修改`utils`文件夹下的中的侧边栏配置、RSS 配置、元信息配置等;
3. 修改`config`文件夹下的相关配置，主要是 title、description、head 的 GA 配置等;
4. 修改`posts/**`与`en/posts/**`目录中的文章内容为自己的内容;

## 协议

本仓库采用双协议授权，即 MIT 协议和 CC-BY-4.0 协议：

- 所有`.md`文件采用 CC-BY-4.0 协议协议，你需要保留署名权
- 其他代码文件采用 MIT 协议，你可以自由使用

具体内容请查看[LICENSE](./LICENSE)文件。

<!-- 旧版博客相关内容移除 -->


