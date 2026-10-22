import { type DefaultTheme, defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '无垠',
  description: 'Sanjeev 的个人博客',
  lang: 'zh-Hans', //语言

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',
    nav: [
      { text: '博客', link: '/' },
      { text: '归档', link: '/archive', activeMatch: '/archive' },
      { text: '项目', link: '/projects', activeMatch: '/projects' },
      { text: '唱片', link: '/albums', activeMatch: '/albums' },
      { text: '关于', link: '/about', activeMatch: '/about' },
    ],
    footer: {
      message:
        'Copyright © 2025-present <a href="https://sanjeev.top/about">Sanjeev</a>.',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    outlineTitle: '本文目录',
    lastUpdatedText: '更新于',

    // sidebar: sideBarConfig,

    socialLinks: [
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>RSS</title><path d="M108.56,342.78a60.34,60.34,0,1,0,60.56,60.44A60.63,60.63,0,0,0,108.56,342.78Z"/><path d="M48,186.67v86.55c52,0,101.94,15.39,138.67,52.11s52,86.56,52,138.67h86.66C325.33,312.44,199.67,186.67,48,186.67Z"/><path d="M48,48v86.56c185.25,0,329.22,144.08,329.22,329.44H464C464,234.66,277.67,48,48,48Z"/></svg>',
        },
        link: '/feed.xml',
      },
      {
        icon: 'github',
        link: 'https://github.com/Sanjeever',
      },
    ],

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '深色模式',
  },
})

export const search: DefaultTheme.AlgoliaSearchOptions['locales'] = {
  root: {
    placeholder: '搜索本站',
    translations: {
      button: {
        buttonText: '搜索本站',
        buttonAriaLabel: '搜索本站',
      },
      modal: {
        searchBox: {
          resetButtonTitle: '清除搜索',
          resetButtonAriaLabel: '清除搜索',
          cancelButtonText: '取消',
          cancelButtonAriaLabel: '取消',
        },
        startScreen: {
          recentSearchesTitle: '搜索历史',
          noRecentSearchesText: '没有搜索历史',
          saveRecentSearchButtonTitle: '保存至搜索历史',
          removeRecentSearchButtonTitle: '从搜索历史中移除',
          favoriteSearchesTitle: '收藏',
          removeFavoriteSearchButtonTitle: '从收藏中移除',
        },
        errorScreen: {
          titleText: '搜索失败',
          helpText: '请重试',
        },
        footer: {
          selectText: '选择',
          navigateText: '切换',
          closeText: '关闭',
          searchByText: '搜索提供者',
        },
        noResultsScreen: {
          noResultsText: '未找到相关结果',
          suggestedQueryText: '试试其他关键词',
          reportMissingResultsText: '缺少预期结果？',
          reportMissingResultsLinkText: '反馈问题',
        },
      },
    },
  },
}
