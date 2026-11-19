// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import { useData } from 'vitepress'
import Theme from 'vitepress/theme' // https://vitepress.dev/zh/guide/extending-default-theme#using-different-fonts
// 引入组件库的少量全局样式变量
import 'tdesign-vue-next/es/style/index.css'

import './style.css'
import Comment from './components/Comment.vue'
import ImageViewer from './components/ImageViewer.vue'
import GoBack from './components/GoBack.vue'
import AlbumWall from './components/AlbumWall.vue'
import AboutProfile from './components/AboutProfile.vue'
import ArchiveIndex from './components/ArchiveIndex.vue'
import ArticleMeta from './components/ArticleMeta.vue'
import ArticleTop from './components/ArticleTop.vue'
import HomeIndex from './components/HomeIndex.vue'
import ProjectIndex from './components/ProjectIndex.vue'
import MermaidDiagram from './components/MermaidDiagram.vue'
import FooterStats from './components/FooterStats.vue'
import SelectionTools from './components/SelectionTools.vue'
import { startDeployUpdateNotifier } from './utils/deployVersion'

export default {
  ...Theme,
  Layout: () => {
    const { page, frontmatter } = useData()
    const articleTop = () =>
      /(^|\/)posts\//.test(page.value.relativePath)
        ? h(ArticleTop, { key: page.value.relativePath })
        : null
    return h(Theme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'doc-before': () => h(ArticleMeta),
      'doc-after': () => [
        frontmatter.value.aside === false ? articleTop() : null,
        h(Comment),
      ],
      'doc-top': () => [h(ImageViewer), h(SelectionTools)],
      'aside-top': () => h(GoBack),
      'aside-outline-after': articleTop,
      'layout-bottom': () => h(FooterStats),
    })
  },

  enhanceApp({ app, siteData }: any) {
    app.component('Comment', Comment)
    app.component('ImageViewer', ImageViewer)
    app.component('GoBack', GoBack)
    app.component('AlbumWall', AlbumWall)
    app.component('AboutProfile', AboutProfile)
    app.component('ArchiveIndex', ArchiveIndex)
    app.component('HomeIndex', HomeIndex)
    app.component('ProjectIndex', ProjectIndex)
    app.component('MermaidDiagram', MermaidDiagram)
    startDeployUpdateNotifier(siteData.value.base)
  },
}
