import { defineConfig, type SiteConfig } from 'vitepress'
// 自动导入 TDesign
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'

import {
  createRssFileZH,
  createRssFileEN,
  generateRssZH,
  generateRssEN,
} from '../theme/utils/rss'
import { handleHeadMeta } from '../theme/utils/handleHeadMeta'
import { search as zhSearch } from './zh'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://sanjeev.top',
  },
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: '/logo.png',
      },
    ],
  ],
  // https://vitepress.dev/reference/site-config#transformhead
  async transformHead(context) {
    return handleHeadMeta(context)
  },
  buildEnd: (config: SiteConfig) => {
    createRssFileZH(config)
    createRssFileEN(config)
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [2, 4],

    search: {
      provider: 'local',
      options: {
        locales: { ...zhSearch },
      },
    },

    externalLinkIcon: true,
  },

  markdown: {
    math: true,
  },

  vite: {
    plugins: [
      // ...
      AutoImport({
        resolvers: [
          TDesignResolver({
            library: 'vue-next',
          }),
        ],
      }),
      Components({
        resolvers: [
          TDesignResolver({
            library: 'vue-next',
          }),
        ],
      }),
      {
        name: 'boundless-rss-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url) return next()
            if (req.url === '/feed.xml') {
              const xml = await generateRssZH()
              res.setHeader(
                'Content-Type',
                'application/rss+xml; charset=utf-8'
              )
              res.end(xml)
              return
            }
            if (req.url === '/feed-en.xml' || req.url === '/en/feed.xml') {
              const xml = await generateRssEN()
              res.setHeader(
                'Content-Type',
                'application/rss+xml; charset=utf-8'
              )
              res.end(xml)
              return
            }
            next()
          })
        },
      },
    ],
    ssr: {
      noExternal: ['tdesign-vue-next', 'tdesign-icons-vue-next'],
    },
  },
})
