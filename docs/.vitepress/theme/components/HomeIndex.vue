<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { data as postsEn } from '../posts-en.data.mts'
import { data as postsZh } from '../posts.data.mts'

const PAGE_SIZE = 10

const route = useRoute()
const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const posts = computed(() => (isEnglish.value ? postsEn : postsZh))
const totalPages = computed(() => Math.ceil(posts.value.length / PAGE_SIZE))
const currentPage = computed(() => {
  const requestedPage = Number(
    new URLSearchParams(route.query).get('page') ?? '1'
  )

  if (!Number.isInteger(requestedPage)) return 1

  return Math.min(Math.max(requestedPage, 1), totalPages.value)
})

const currentPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return posts.value.slice(start, start + PAGE_SIZE)
})

const featuredPost = computed(() =>
  currentPage.value === 1 ? currentPosts.value[0] : null
)
const gridPosts = computed(() =>
  currentPage.value === 1 ? currentPosts.value.slice(1) : currentPosts.value
)

const copy = computed(() =>
  isEnglish.value
    ? {
        description: "Sanjeev's personal blog about learning, craft, and life.",
        metaStatus: (total: number) => `${total} published writings`,
        featured: 'Featured writing',
        readArticle: 'Read article',
        projects: 'Open source',
        projectsTitle: 'Developer Craft',
        projectDescription: 'Tools for ports, SSH, and AI client workflows.',
        openProjects: 'View projects',
        albums: 'Curated music',
        albumsTitle: 'Vinyl Collection',
        albumDescription: 'Full-length albums and records listened to in full.',
        openAlbums: 'Explore albums',
        stories: 'Recent writing',
        pageTitle: (page: number) => `Writing · Page ${page}`,
        previous: 'Previous',
        next: 'Next',
        pagination: 'Blog pagination',
      }
    : {
        description: 'Sanjeev 的个人博客，记录技术实践、思考与生活。',
        metaStatus: (total: number) => `共收录 ${total} 篇思考与记录`,
        featured: '精选聚焦',
        readArticle: '阅读全文',
        projects: '开源工坊',
        projectsTitle: '开发工具与实践',
        projectDescription: '端口治理、多节点 SSH 及 AI 客户端工作流工具。',
        openProjects: '浏览全部项目',
        albums: '音乐品味',
        albumsTitle: '黑胶唱片墙',
        albumDescription: '以完整专辑为单位，记录沉淀在时间里的声音。',
        openAlbums: '浏览唱片墙',
        stories: '近期文章',
        pageTitle: (page: number) => `文章列表 · 第 ${page} 页`,
        previous: '上一页',
        next: '下一页',
        pagination: '博客分页',
      }
)

const homePath = computed(() => (isEnglish.value ? '/en/' : '/'))
const projectsPath = computed(() =>
  isEnglish.value ? '/en/projects' : '/projects'
)
const albumsPath = computed(() => (isEnglish.value ? '/en/albums' : '/albums'))

function pageHref(page: number) {
  return page === 1 ? homePath.value : `${homePath.value}?page=${page}`
}

function dateTime(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}
</script>

<template>
  <main class="home-index">
    <!-- First page hero -->
    <header v-if="currentPage === 1" class="home-intro">
      <div class="intro-copy">
        <div class="intro-badge">
          <span class="status-dot" aria-hidden="true"></span>
          <span>{{ copy.metaStatus(posts.length) }}</span>
        </div>
        <h1>{{ isEnglish ? 'Boundless' : '无垠' }}</h1>
        <p>{{ copy.description }}</p>
      </div>
      <div class="intro-mark-wrap" aria-hidden="true">
        <img
          class="intro-mark"
          src="/logo.png"
          :alt="isEnglish ? 'Boundless flower mark' : '无垠花瓣标志'"
          width="400"
          height="400" />
      </div>
    </header>

    <!-- Subpage header -->
    <header v-else class="subpage-header">
      <h1 class="subpage-title">{{ copy.pageTitle(currentPage) }}</h1>
    </header>

    <!-- Featured Post -->
    <section v-if="featuredPost" class="featured-section">
      <div class="section-label">{{ copy.featured }}</div>
      <article class="featured-post">
        <div class="featured-aside">
          <time :datetime="dateTime(featuredPost.date.time)">
            {{ featuredPost.date.string }}
          </time>
          <div
            v-if="featuredPost.tags?.length"
            class="featured-tags"
            :aria-label="isEnglish ? 'Tags' : '标签'">
            <span v-for="tag in featuredPost.tags" :key="tag">#{{ tag }}</span>
          </div>
        </div>
        <div class="featured-main">
          <h2>
            <a :href="featuredPost.url">{{ featuredPost.title }}</a>
          </h2>
          <div
            v-if="featuredPost.excerpt"
            class="post-summary"
            v-html="featuredPost.excerpt" />
          <div class="featured-action-wrap">
            <a :href="featuredPost.url" class="featured-link">
              <span>{{ copy.readArticle }}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path
                  d="M3.33334 8H12.6667M12.6667 8L8.66668 4M12.6667 8L8.66668 12"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </article>
    </section>

    <!-- Bento Showcase -->
    <section v-if="currentPage === 1" class="bento-section">
      <div class="bento-grid">
        <!-- Projects Bento Card -->
        <a class="bento-card bento-projects" :href="projectsPath">
          <div class="bento-inner">
            <div class="bento-meta">
              <span class="bento-badge">{{ copy.projects }}</span>
              <span class="bento-arrow" aria-hidden="true">↗</span>
            </div>
            <h3>{{ copy.projectsTitle }}</h3>
            <p>{{ copy.projectDescription }}</p>
            <div class="project-tags" aria-hidden="true">
              <span>SSH MCP</span>
              <span>Port Sentinel</span>
              <span>Codex Deck</span>
            </div>
          </div>
          <div class="bento-watermark" aria-hidden="true">
            <img src="/logo.png" alt="" width="260" height="260" />
          </div>
        </a>

        <!-- Albums Bento Card -->
        <a class="bento-card bento-albums" :href="albumsPath">
          <div class="bento-inner">
            <div class="bento-meta">
              <span class="bento-badge">{{ copy.albums }}</span>
              <span class="bento-arrow" aria-hidden="true">↗</span>
            </div>
            <h3>{{ copy.albumsTitle }}</h3>
            <p>{{ copy.albumDescription }}</p>
            <span class="bento-cta">{{ copy.openAlbums }} →</span>
          </div>
          <div class="album-stack" aria-hidden="true">
            <img
              class="album-cover cover-1"
              src="/images/albums/jesus-is-king.jpg"
              alt="" />
            <img
              class="album-cover cover-2"
              src="/images/albums/back-of-me.jpg"
              alt="" />
            <img
              class="album-cover cover-3"
              src="/images/albums/groupies.jpg"
              alt="" />
          </div>
        </a>
      </div>
    </section>

    <!-- Stories Grid Section -->
    <section v-if="gridPosts.length" class="stories-section">
      <div class="section-label">
        {{ currentPage === 1 ? copy.stories : '' }}
      </div>
      <div class="stories-grid">
        <article v-for="post in gridPosts" :key="post.url" class="story-card">
          <div class="story-header">
            <time :datetime="dateTime(post.date.time)">
              {{ post.date.monthDay }}
            </time>
            <div
              v-if="post.tags?.length"
              class="story-tags"
              :aria-label="isEnglish ? 'Tags' : '标签'">
              <span v-for="tag in post.tags.slice(0, 2)" :key="tag">
                #{{ tag }}
              </span>
            </div>
          </div>
          <h3>
            <a :href="post.url">{{ post.title }}</a>
          </h3>
          <div
            v-if="post.excerpt"
            class="story-summary"
            v-html="post.excerpt" />
        </article>
      </div>
    </section>

    <!-- Pagination -->
    <nav
      v-if="totalPages > 1"
      class="blog-pagination"
      :aria-label="copy.pagination">
      <a
        v-if="currentPage > 1"
        class="page-direction"
        :href="pageHref(currentPage - 1)">
        {{ copy.previous }}
      </a>
      <span v-else class="page-direction is-disabled">{{ copy.previous }}</span>

      <div class="page-numbers">
        <a
          v-for="page in totalPages"
          :key="page"
          :href="pageHref(page)"
          :aria-current="page === currentPage ? 'page' : undefined">
          {{ page }}
        </a>
      </div>

      <a
        v-if="currentPage < totalPages"
        class="page-direction"
        :href="pageHref(currentPage + 1)">
        {{ copy.next }}
      </a>
      <span v-else class="page-direction is-disabled">{{ copy.next }}</span>
    </nav>
  </main>
</template>

<style scoped>
.home-index {
  width: min(1180px, 100%);
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 64px) clamp(24px, 4vw, 48px) 112px;
}

/* Intro Header */
.home-intro {
  display: grid;
  grid-template-columns: minmax(0, 7.5fr) minmax(220px, 3.5fr);
  align-items: center;
  min-height: 320px;
  margin-bottom: 96px;
}

.intro-badge {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 24px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.intro-copy h1 {
  max-width: 8ch;
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(60px, 8.5vw, 104px);
  font-weight: 650;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.intro-copy p {
  max-width: 32ch;
  margin: 24px 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(17px, 1.6vw, 20px);
  line-height: 1.7;
}

.intro-mark-wrap {
  display: flex;
  justify-content: flex-end;
}

.intro-mark {
  width: min(240px, 100%);
  height: auto;
  opacity: 0.9;
  transform: rotate(3deg);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.intro-mark:hover {
  transform: rotate(7deg) scale(1.02);
}

/* Subpage Header */
.subpage-header {
  margin-bottom: 64px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.subpage-title {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 640;
  letter-spacing: -0.04em;
}

/* Section Label */
.section-label {
  margin-bottom: 24px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Featured Section */
.featured-section {
  margin-bottom: 88px;
}

.featured-post {
  display: grid;
  grid-template-columns: minmax(130px, 1.8fr) minmax(0, 8.2fr);
  column-gap: clamp(28px, 5vw, 64px);
  align-items: start;
  padding-bottom: 48px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.featured-aside time,
.story-header time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.featured-aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 10px;
}

.featured-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.featured-main h2 {
  margin: 0;
  font-size: clamp(34px, 4.2vw, 54px);
  font-weight: 620;
  letter-spacing: -0.04em;
  line-height: 1.14;
}

.featured-main h2 a,
.story-card h3 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 180ms ease;
}

.featured-main h2 a:hover,
.featured-main h2 a:focus-visible,
.story-card h3 a:hover,
.story-card h3 a:focus-visible {
  color: var(--vp-c-brand-1);
}

.post-summary {
  max-width: 64ch;
  margin-top: 22px;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.75;
}

.post-summary :deep(p) {
  margin: 0;
}

.post-summary :deep(a) {
  color: inherit;
  text-decoration: none;
}

.featured-action-wrap {
  margin-top: 26px;
}

.featured-link {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--vp-c-brand-1);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: gap 180ms ease;
}

.featured-link:hover {
  gap: 10px;
}

/* Bento Showcase */
.bento-section {
  margin-bottom: 96px;
}

.bento-grid {
  display: grid;
  grid-template-columns: minmax(0, 5.5fr) minmax(0, 6.5fr);
  gap: 20px;
}

.bento-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 280px;
  overflow: hidden;
  border-radius: var(--boundless-radius);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 220ms ease;
}

.bento-card:hover,
.bento-card:focus-visible {
  transform: translateY(-3px);
}

.bento-projects {
  padding: clamp(24px, 3.5vw, 36px);
  border: 1px solid var(--vp-c-border);
  background: var(--boundless-accent-soft);
}

.bento-projects:hover {
  box-shadow: 0 8px 24px rgb(0 0 0 / 6%);
}

.bento-albums {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(180px, 0.85fr);
  align-items: center;
  padding: clamp(24px, 3.5vw, 36px);
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.bento-albums:hover {
  box-shadow: 0 8px 24px rgb(0 0 0 / 6%);
}

.bento-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bento-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.bento-badge {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.bento-arrow {
  color: var(--vp-c-text-3);
  font-size: 16px;
  transition:
    transform 200ms ease,
    color 200ms ease;
}

.bento-card:hover .bento-arrow {
  color: var(--vp-c-brand-1);
  transform: translate(2px, -2px);
}

.bento-card h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 640;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.bento-card p {
  margin: 10px 0 20px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.project-tags span {
  padding: 3px 9px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.bento-watermark {
  position: absolute;
  top: -60px;
  right: -60px;
  pointer-events: none;
  opacity: 0.28;
  transform: rotate(12deg);
}

.bento-cta {
  margin-top: auto;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
}

.album-stack {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 180px;
}

.album-cover {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: var(--boundless-radius);
  object-fit: cover;
  box-shadow: var(--boundless-media-shadow);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.cover-1 {
  z-index: 1;
  transform: translateX(-38px) rotate(-8deg);
}

.cover-2 {
  z-index: 3;
  transform: scale(1.08) rotate(0deg);
}

.cover-3 {
  z-index: 2;
  transform: translateX(38px) rotate(9deg);
}

.bento-albums:hover .cover-1 {
  transform: translateX(-48px) rotate(-14deg);
}

.bento-albums:hover .cover-2 {
  transform: scale(1.12) rotate(2deg);
}

.bento-albums:hover .cover-3 {
  transform: translateX(48px) rotate(14deg);
}

/* Stories Grid */
.stories-section {
  margin-bottom: 96px;
}

.stories-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 56px clamp(36px, 6vw, 84px);
}

.story-card {
  display: flex;
  flex-direction: column;
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.story-tags {
  display: flex;
  gap: 8px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.story-card h3 {
  margin: 0;
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.34;
}

.story-summary {
  display: -webkit-box;
  margin-top: 14px;
  color: var(--vp-c-text-2);
  font-size: 15px;
  line-height: 1.7;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.story-summary :deep(p) {
  margin: 0;
}

/* Blog Pagination */
.blog-pagination {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.blog-pagination a {
  color: inherit;
  text-decoration: none;
}

.page-direction:last-child,
.blog-pagination > .is-disabled:last-child {
  justify-self: end;
}

.page-direction:hover,
.page-direction:focus-visible,
.page-numbers a:hover,
.page-numbers a:focus-visible,
.page-numbers a[aria-current='page'] {
  color: var(--vp-c-brand-1);
}

.page-direction.is-disabled {
  color: var(--vp-c-text-3);
  cursor: default;
}

.page-numbers {
  display: flex;
  gap: 8px;
}

.page-numbers a {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: var(--boundless-radius);
  transition: background-color 150ms ease;
}

.page-numbers a[aria-current='page'] {
  background: var(--boundless-accent-soft);
  font-weight: 650;
}

/* Reveal Animations */
@media (prefers-reduced-motion: no-preference) {
  .home-intro,
  .featured-section,
  .bento-section {
    animation: home-reveal 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .featured-section {
    animation-delay: 80ms;
  }

  .bento-section {
    animation-delay: 140ms;
  }
}

@keyframes home-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* Mobile & Responsive */
@media (max-width: 900px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }

  .bento-albums {
    grid-template-columns: 1fr auto;
  }
}

@media (max-width: 767px) {
  .home-index {
    padding: calc(var(--vp-nav-height) + 40px) 18px 72px;
  }

  .home-intro {
    grid-template-columns: minmax(0, 1fr) 100px;
    min-height: 220px;
    margin-bottom: 64px;
  }

  .intro-copy h1 {
    font-size: clamp(48px, 15vw, 64px);
  }

  .intro-copy p {
    margin-top: 16px;
    font-size: 16px;
  }

  .intro-mark {
    width: 96px;
  }

  .featured-section {
    margin-bottom: 64px;
  }

  .featured-post {
    display: block;
    padding-bottom: 36px;
  }

  .featured-aside {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-top: 0;
    margin-bottom: 16px;
  }

  .featured-main h2 {
    font-size: clamp(28px, 8.5vw, 38px);
    line-height: 1.18;
  }

  .bento-section {
    margin-bottom: 72px;
  }

  .bento-albums {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .album-stack {
    height: 140px;
  }

  .stories-section {
    margin-bottom: 72px;
  }

  .stories-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .blog-pagination {
    gap: 12px;
  }

  .page-direction {
    font-size: 13px;
  }
}

@media (max-width: 420px) {
  .home-intro {
    grid-template-columns: minmax(0, 1fr) 76px;
  }

  .intro-mark {
    width: 76px;
  }

  .album-stack {
    scale: 0.88;
  }
}
</style>
