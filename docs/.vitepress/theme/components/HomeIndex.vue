<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { data as postsEn } from '../posts-en.data.mts'
import { data as postsZh } from '../posts.data.mts'

const PAGE_SIZE = 15

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

interface YearGroup {
  year: string
  posts: (typeof posts.value)[number][]
}

const groupedPosts = computed<YearGroup[]>(() => {
  const groups: YearGroup[] = []
  let currentYear = ''
  let currentGroup: YearGroup | null = null

  for (const post of currentPosts.value) {
    const year = post.date.year || 'Earlier'
    if (year !== currentYear) {
      currentYear = year
      currentGroup = { year, posts: [post] }
      groups.push(currentGroup)
    } else if (currentGroup) {
      currentGroup.posts.push(post)
    }
  }

  return groups
})

const copy = computed(() =>
  isEnglish.value
    ? {
        brand: 'Boundless',
        slogan: 'Writing code, building tools, and keeping raw notes.',
        pageTitle: (page: number) => `Index · Page ${page}`,
        previous: '← Prev',
        next: 'Next →',
        pagination: 'Pagination',
      }
    : {
        brand: '无垠',
        slogan: '写代码，做小工具，记录具体的排查与想法。',
        pageTitle: (page: number) => `文章目次 · 第 ${page} 页`,
        previous: '← 上一页',
        next: '下一页 →',
        pagination: '文章分页',
      }
)

const homePath = computed(() => (isEnglish.value ? '/en/' : '/'))

function pageHref(page: number) {
  return page === 1 ? homePath.value : `${homePath.value}?page=${page}`
}

function dateTime(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}
</script>

<template>
  <main class="home-paper">
    <!-- Header: 纸墨排印的经典居中/简约头部 -->
    <header class="paper-header">
      <div v-if="currentPage === 1" class="header-intro">
        <h1 class="site-title">{{ copy.brand }}</h1>
        <p class="site-slogan">{{ copy.slogan }}</p>
      </div>
      <div v-else class="header-subpage">
        <h1 class="subpage-title">{{ copy.pageTitle(currentPage) }}</h1>
      </div>
      <hr class="head-rule" />
    </header>

    <!-- Post Chronological Index: 纯粹的目次年鉴 -->
    <section class="index-section" aria-label="Articles">
      <div v-for="group in groupedPosts" :key="group.year" class="post-group">
        <h2 class="group-year">{{ group.year }}</h2>

        <ul class="post-list">
          <li v-for="post in group.posts" :key="post.url" class="post-item">
            <a :href="post.url" class="post-link">
              <span class="post-title">{{ post.title }}</span>
            </a>

            <div class="post-meta">
              <span v-if="post.tags && post.tags.length" class="post-tags">
                <span
                  v-for="tag in post.tags.slice(0, 2)"
                  :key="tag"
                  class="post-tag">
                  #{{ tag }}
                </span>
              </span>
              <time :datetime="dateTime(post.date.time)" class="post-date">
                {{ post.date.string || post.date.monthDay }}
              </time>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- Pagination: 简洁打字机翻页 -->
    <nav
      v-if="totalPages > 1"
      class="paper-pagination"
      :aria-label="copy.pagination">
      <a
        v-if="currentPage > 1"
        class="page-nav prev"
        :href="pageHref(currentPage - 1)">
        {{ copy.previous }}
      </a>
      <span v-else class="page-nav prev disabled">{{ copy.previous }}</span>

      <div class="page-numbers">
        <a
          v-for="page in totalPages"
          :key="page"
          :href="pageHref(page)"
          class="page-number"
          :class="{ active: page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined">
          {{ page }}
        </a>
      </div>

      <a
        v-if="currentPage < totalPages"
        class="page-nav next"
        :href="pageHref(currentPage + 1)">
        {{ copy.next }}
      </a>
      <span v-else class="page-nav next disabled">{{ copy.next }}</span>
    </nav>
  </main>
</template>

<style scoped>
.home-paper {
  width: min(780px, 100%);
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 48px) clamp(20px, 4vw, 36px) 96px;
}

/* Header */
.paper-header {
  margin-bottom: 32px;
}

.header-intro {
  padding-top: 12px;
}

.site-title {
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
  font-size: clamp(34px, 5vw, 44px);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.site-slogan {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.7;
}

.subpage-title {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(26px, 3.5vw, 32px);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.head-rule {
  width: 100%;
  margin: 28px 0 0;
  border: 0;
  height: 1px;
  background-color: var(--vp-c-text-1);
  opacity: 0.12;
}

/* Post Chronological Index */
.index-section {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.post-group {
  display: flex;
  flex-direction: column;
}

.group-year {
  margin: 0 0 16px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.post-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px 24px;
  padding-block: 10px;
  border-bottom: 1px dashed var(--vp-c-divider);
  transition: border-color 150ms ease;
}

.post-item:hover {
  border-bottom-color: var(--vp-c-border);
}

.post-link {
  flex: 1 1 360px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 17px;
  line-height: 1.55;
  transition: color 150ms ease;
}

.post-title {
  background-image: linear-gradient(
    to right,
    var(--vp-c-brand-1) 0%,
    var(--vp-c-brand-1) 100%
  );
  background-position: 0 100%;
  background-size: 0% 1px;
  background-repeat: no-repeat;
  transition: background-size 220ms ease;
}

.post-link:hover .post-title {
  color: var(--vp-c-brand-1);
  background-size: 100% 1px;
}

.post-meta {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-shrink: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.post-tags {
  display: flex;
  gap: 8px;
}

.post-tag {
  color: var(--vp-c-text-3);
  opacity: 0.85;
}

.post-date {
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Pagination */
.paper-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.page-nav {
  color: var(--vp-c-text-2);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: var(--boundless-radius);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.page-nav:hover:not(.disabled) {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.page-nav.disabled {
  color: var(--vp-c-text-3);
  opacity: 0.4;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-number {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--boundless-radius);
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.page-number:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.page-number.active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  font-weight: 600;
}

@media (max-width: 640px) {
  .post-item {
    flex-direction: column;
    gap: 4px;
    padding-block: 8px;
  }

  .post-meta {
    justify-content: flex-start;
    gap: 12px;
  }
}
</style>
