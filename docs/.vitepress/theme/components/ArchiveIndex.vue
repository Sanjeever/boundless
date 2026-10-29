<script setup lang="ts">
import { computed } from 'vue'
import { inBrowser, useData } from 'vitepress'
import { data as postsEn } from '../posts-en.data.mts'
import { data as postsZh } from '../posts.data.mts'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const posts = computed(() => (isEnglish.value ? postsEn : postsZh))

const postGroups = computed(() => {
  const groups = new Map<string, typeof posts.value>()

  posts.value.forEach(post => {
    const group = groups.get(post.date.year) ?? []
    group.push(post)
    groups.set(post.date.year, group)
  })

  return groups
})

const availableYears = computed(() =>
  Array.from(postGroups.value.entries()).map(([year, group]) => ({
    year,
    count: group.length,
  }))
)

function scrollToYear(year: string) {
  if (!inBrowser) return
  const target = document.getElementById(`year-${year}`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function dateTime(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'Archive',
        jumpToYear: 'Years',
      }
    : {
        title: '文章归档',
        jumpToYear: '年份快速跳转',
      }
)
</script>

<template>
  <main class="archive-index">
    <!-- Header -->
    <header class="archive-header">
      <h1>{{ copy.title }}</h1>

      <!-- Year Scrubber -->
      <nav
        v-if="availableYears.length > 1"
        class="year-scrubber"
        :aria-label="copy.jumpToYear">
        <button
          v-for="item in availableYears"
          :key="item.year"
          type="button"
          class="year-btn"
          @click="scrollToYear(item.year)">
          <span>{{ item.year }}</span>
          <span class="year-count">({{ item.count }})</span>
        </button>
      </nav>
      <hr class="head-rule" />
    </header>

    <!-- Timeline Content -->
    <section
      v-for="[year, yearPosts] in postGroups"
      :id="`year-${year}`"
      :key="year"
      class="archive-year">
      <div class="year-heading">
        <h2>{{ year }}</h2>
        <span class="year-badge">{{ yearPosts.length }}</span>
      </div>

      <div class="archive-posts">
        <a
          v-for="post in yearPosts"
          :key="post.url"
          :href="post.url"
          class="post-link">
          <time :datetime="dateTime(post.date.time)">
            {{ post.date.monthDay }}
          </time>
          <span class="post-title">{{ post.title }}</span>
        </a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.archive-index {
  width: min(780px, 100%);
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 48px) clamp(20px, 4vw, 36px) 112px;
}

/* Header */
.archive-header {
  margin-bottom: 48px;
}

.archive-header h1 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(34px, 5vw, 44px);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.head-rule {
  width: 100%;
  margin: 24px 0 0;
  border: 0;
  height: 1px;
  background-color: var(--vp-c-text-1);
  opacity: 0.12;
}

/* Year Scrubber */
.year-scrubber {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.year-btn {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  padding: 3px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms ease;
}

.year-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.year-count {
  font-size: 11px;
  opacity: 0.65;
}

/* Year Section */
.archive-year {
  margin-top: 48px;
  scroll-margin-top: calc(var(--vp-nav-height) + 36px);
}

.year-heading {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 16px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.year-heading h2 {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.year-badge {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

/* Posts List */
.archive-posts {
  display: flex;
  flex-direction: column;
}

.post-link {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding-block: 8px;
  border-bottom: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-1);
  font-size: 16px;
  line-height: 1.5;
  text-decoration: none;
  transition: border-color 150ms ease;
}

.post-link:hover {
  border-bottom-color: var(--vp-c-border);
}

.post-link time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.post-title {
  transition: color 150ms ease;
  word-break: break-word;
}

.post-link:hover .post-title,
.post-link:focus-visible .post-title {
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .post-link {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
