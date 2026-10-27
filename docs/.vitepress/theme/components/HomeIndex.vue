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
        featured: 'Latest writing',
        stories: 'Recent writing',
        projects: 'Open source',
        projectDescription: 'Tools for ports, SSH, and AI client workflows',
        albums: 'Albums',
        albumDescription: 'Full-length albums listened to in full',
        pageTitle: (page: number) => `Writing · Page ${page}`,
        previous: 'Previous',
        next: 'Next',
        pagination: 'Blog pagination',
      }
    : {
        description: 'Sanjeev 的个人博客，记录学习与生活。',
        featured: '最新文章',
        stories: '最近文章',
        projects: '开源项目',
        projectDescription: '端口管理、SSH 连接和 AI 开发工具',
        albums: '听过的专辑',
        albumDescription: '以专辑为单位，记录听过的音乐',
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
    <!-- Intro Hero -->
    <header v-if="currentPage === 1" class="home-intro">
      <div class="intro-copy">
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

    <!-- Subpage Header -->
    <header v-else class="subpage-header">
      <h1 class="subpage-title">{{ copy.pageTitle(currentPage) }}</h1>
    </header>

    <!-- Featured Post -->
    <section v-if="featuredPost" class="featured-section">
      <h2 class="section-label">{{ copy.featured }}</h2>
      <article class="featured-post">
        <time :datetime="dateTime(featuredPost.date.time)">
          {{ featuredPost.date.string }}
        </time>
        <div class="featured-body">
          <h3>
            <a :href="featuredPost.url">{{ featuredPost.title }}</a>
          </h3>
          <div
            v-if="featuredPost.excerpt"
            class="featured-summary"
            v-html="featuredPost.excerpt" />
        </div>
      </article>
    </section>

    <!-- Post Stream -->
    <section v-if="gridPosts.length" class="stories-section">
      <h2 v-if="currentPage === 1" class="section-label">
        {{ copy.stories }}
      </h2>
      <div class="stories-grid">
        <article v-for="post in gridPosts" :key="post.url" class="story-item">
          <time :datetime="dateTime(post.date.time)">
            {{ post.date.monthDay }}
          </time>
          <h3>
            <a :href="post.url">{{ post.title }}</a>
          </h3>
        </article>
      </div>
    </section>

    <!-- Quiet Linkways -->
    <section v-if="currentPage === 1" class="site-linkways">
      <a :href="projectsPath" class="linkway-card">
        <div class="linkway-meta">
          <span class="linkway-title">{{ copy.projects }}</span>
          <span class="linkway-arrow" aria-hidden="true">↗</span>
        </div>
        <p>{{ copy.projectDescription }}</p>
      </a>

      <a :href="albumsPath" class="linkway-card">
        <div class="linkway-meta">
          <span class="linkway-title">{{ copy.albums }}</span>
          <span class="linkway-arrow" aria-hidden="true">↗</span>
        </div>
        <p>{{ copy.albumDescription }}</p>
      </a>
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
  transform: rotate(6deg) scale(1.02);
}

/* Subpage Header */
.subpage-header {
  margin-bottom: 64px;
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
  margin: 0 0 24px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

/* Featured Section */
.featured-section {
  margin-bottom: 88px;
}

.featured-post {
  display: grid;
  grid-template-columns: minmax(120px, 1.5fr) minmax(0, 8.5fr);
  column-gap: clamp(28px, 5vw, 64px);
  align-items: start;
}

.featured-post > time {
  padding-top: 10px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.featured-body h3 {
  max-width: 24ch;
  margin: 0;
  font-size: clamp(34px, 4.4vw, 56px);
  font-weight: 620;
  letter-spacing: -0.04em;
  line-height: 1.12;
}

.featured-body h3 a,
.story-item h3 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 180ms ease;
}

.featured-body h3 a:hover,
.featured-body h3 a:focus-visible,
.story-item h3 a:hover,
.story-item h3 a:focus-visible {
  color: var(--vp-c-brand-1);
}

.featured-summary {
  max-width: 64ch;
  margin-top: 22px;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.75;
}

.featured-summary :deep(p) {
  margin: 0;
}

.featured-summary :deep(a) {
  color: inherit;
  text-decoration: none;
}

/* Stories Stream */
.stories-section {
  margin-bottom: 88px;
}

.stories-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px clamp(36px, 6vw, 84px);
}

.story-item {
  display: grid;
  grid-template-columns: minmax(56px, auto) minmax(0, 1fr);
  gap: 16px;
  align-items: baseline;
  padding-block: 6px;
}

.story-item time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.story-item h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.55;
}

/* Site Linkways */
.site-linkways {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 80px;
}

.linkway-card {
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: background-color 180ms ease;
}

.linkway-card:hover,
.linkway-card:focus-visible {
  background: var(--boundless-accent-soft);
}

.linkway-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.linkway-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.linkway-arrow {
  color: var(--vp-c-text-3);
  font-size: 15px;
  transition:
    transform 180ms ease,
    color 180ms ease;
}

.linkway-card:hover .linkway-arrow {
  color: var(--vp-c-brand-1);
  transform: translate(2px, -2px);
}

.linkway-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

/* Pagination */
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

/* Reduced motion */
@media (prefers-reduced-motion: no-preference) {
  .home-intro,
  .featured-section {
    animation: home-reveal 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .featured-section {
    animation-delay: 80ms;
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

/* Responsive */
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
  }

  .featured-post > time {
    display: block;
    padding-top: 0;
    margin-bottom: 12px;
  }

  .featured-body h3 {
    font-size: clamp(28px, 8.5vw, 38px);
    line-height: 1.18;
  }

  .stories-section {
    margin-bottom: 64px;
  }

  .stories-grid,
  .site-linkways {
    grid-template-columns: 1fr;
    gap: 16px;
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
}
</style>
