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
        summary: (count: number, years: number) =>
          `${count} articles across ${years} years`,
        jumpToYear: 'Years',
      }
    : {
        title: '文章归档',
        summary: (count: number, years: number) =>
          `共收录 ${count} 篇文章 · 跨越 ${years} 个年份`,
        jumpToYear: '年份快速跳转',
      }
)
</script>

<template>
  <main class="archive-index">
    <!-- Header -->
    <header class="archive-header">
      <h1>{{ copy.title }}</h1>
      <p class="archive-summary">
        {{ copy.summary(posts.length, availableYears.length) }}
      </p>

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
  width: min(1120px, 100%);
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 64px) clamp(24px, 4vw, 48px) 120px;
}

/* Header */
.archive-header {
  max-width: 800px;
  margin-bottom: 72px;
}

.archive-header h1 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(48px, 6.5vw, 76px);
  font-weight: 640;
  letter-spacing: -0.055em;
  line-height: 1;
}

.archive-summary {
  margin: 20px 0 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.6;
}

/* Year Scrubber */
.year-scrubber {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.year-btn {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--boundless-radius);
  background: transparent;
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
  display: grid;
  grid-template-columns: minmax(110px, 1.2fr) minmax(0, 8.8fr);
  gap: clamp(32px, 6vw, 84px);
  align-items: start;
  margin-top: 80px;
  scroll-margin-top: calc(var(--vp-nav-height) + 36px);
}

.year-heading {
  position: sticky;
  top: calc(var(--vp-nav-height) + 36px);
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.year-heading h2 {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.year-badge {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

/* Posts List */
.archive-posts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px clamp(32px, 4vw, 56px);
}

.post-link {
  display: grid;
  grid-template-columns: minmax(48px, auto) minmax(0, 1fr);
  gap: 16px;
  align-items: baseline;
  color: var(--vp-c-text-1);
  font-size: 15px;
  line-height: 1.55;
  text-decoration: none;
}

.post-link time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.post-title {
  transition: color 180ms ease;
  word-break: break-word;
}

.post-link:hover .post-title,
.post-link:focus-visible .post-title {
  color: var(--vp-c-brand-1);
}

/* Animations */
@media (prefers-reduced-motion: no-preference) {
  .archive-header {
    animation: archive-reveal 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

@keyframes archive-reveal {
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
@media (max-width: 900px) {
  .archive-posts {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

@media (max-width: 767px) {
  .archive-index {
    padding: calc(var(--vp-nav-height) + 40px) 18px 80px;
  }

  .archive-header {
    margin-bottom: 48px;
  }

  .archive-header h1 {
    font-size: clamp(38px, 12vw, 48px);
  }

  .archive-year {
    display: block;
    margin-top: 56px;
  }

  .year-heading {
    position: static;
    margin-bottom: 20px;
  }
}
</style>
