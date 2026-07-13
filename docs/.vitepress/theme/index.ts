// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
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
import HomeIndex from './components/HomeIndex.vue'
import ProjectIndex from './components/ProjectIndex.vue'
import { startDeployUpdateNotifier } from './utils/deployVersion'

export default {
  ...Theme,
  Layout: () => {
    return h(Theme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'doc-before': () => h(ArticleMeta),
      'doc-after': () => h(Comment),
      'doc-top': () => h(ImageViewer),
      'aside-top': () => h(GoBack),
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
    startDeployUpdateNotifier(siteData.value.base)
  },
}
