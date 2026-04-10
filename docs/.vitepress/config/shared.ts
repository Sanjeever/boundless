import { defineConfig, type SiteConfig } from 'vitepress'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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

function getDeployVersion(): string {
  const commitSha = process.env.CF_PAGES_COMMIT_SHA

  if (commitSha) {
    return `${new Date().toISOString()}-${commitSha.slice(0, 7)}`
  }

  return new Date().toISOString()
}

async function writeDeployVersionFile(config: SiteConfig): Promise<void> {
  const filePath = join(config.outDir, 'version.json')
  const payload = JSON.stringify({ version: getDeployVersion() }, null, 2)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, payload, 'utf8')
}

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
  buildEnd: async (config: SiteConfig) => {
    createRssFileZH(config)
    createRssFileEN(config)
    await writeDeployVersionFile(config)
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
