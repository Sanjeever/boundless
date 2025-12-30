import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { Feed } from 'feed'
import { createContentLoader, type SiteConfig } from 'vitepress'

const hostname = 'https://sanjeev.top'

export async function generateRssZH(): Promise<string> {
  const feed = new Feed({
    title: '无垠 Boundless',
    description: 'Sanjeev 的个人博客',
    id: hostname,
    link: hostname,
    language: 'zh-Hans',
    copyright: 'Copyright© 2025-present Sanjeev',
  })

  const posts = await createContentLoader('posts/**/*.md', {
    excerpt: true,
    render: true,
  }).load()

  posts.sort((a, b) =>
    Number(+new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
  )

  for (const { url, excerpt, html, frontmatter } of posts) {
    if (feed.items.length >= 5) {
      break
    }
    feed.addItem({
      title: frontmatter.title,
      id: `${hostname}${url}`,
      link: `${hostname}${url}`,
      description: excerpt,
      content: html,
      author: [
        {
          name: 'Sanjeev',
          email: 'bestoftribe@foxmail.com',
          link: hostname,
        },
      ],
      date: frontmatter.date,
    })
  }

  return feed.rss2()
}

export async function createRssFileZH(config: SiteConfig) {
  const rss = await generateRssZH()
  writeFileSync(path.join(config.outDir, 'feed.xml'), rss, 'utf-8')
}

export async function generateRssEN(): Promise<string> {
  const feed = new Feed({
    title: 'Boundless',
    description: "Sanjeev's personal blog",
    id: hostname,
    link: hostname,
    language: 'en-US',
    copyright: 'Copyright© 2025-present Sanjeev',
  })

  const posts = await createContentLoader('en/posts/**/*.md', {
    excerpt: true,
    render: true,
  }).load()

  posts.sort((a, b) =>
    Number(+new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
  )

  for (const { url, excerpt, html, frontmatter } of posts) {
    if (feed.items.length >= 5) {
      break
    }
    feed.addItem({
      title: frontmatter.title,
      id: `${hostname}${url}`,
      link: `${hostname}${url}`,
      description: excerpt,
      content: html,
      author: [
        {
          name: 'Sanjeev',
          email: 'bestoftribe@foxmail.com',
          link: hostname,
        },
      ],
      date: frontmatter.date,
    })
  }

  return feed.rss2()
}

export async function createRssFileEN(config: SiteConfig) {
  const rss = await generateRssEN()
  writeFileSync(path.join(config.outDir, 'feed-en.xml'), rss, 'utf-8')
}
