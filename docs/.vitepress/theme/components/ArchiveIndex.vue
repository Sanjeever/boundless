<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { inBrowser, useData } from 'vitepress'
import { data as postsEn } from '../posts-en.data.mts'
import { data as postsZh } from '../posts.data.mts'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const posts = computed(() => (isEnglish.value ? postsEn : postsZh))

const selectedTag = ref<string | null>(null)

onMounted(() => {
  if (inBrowser) {
    const params = new URLSearchParams(window.location.search)
    const tagFromUrl = params.get('tag')
    if (tagFromUrl) {
      selectedTag.value = tagFromUrl
    }
  }
})

function selectTag(tag: string | null) {
  selectedTag.value = selectedTag.value === tag ? null : tag

  if (inBrowser) {
    const url = new URL(window.location.href)
    if (selectedTag.value) {
      url.searchParams.set('tag', selectedTag.value)
    } else {
      url.searchParams.delete('tag')
    }
    window.history.replaceState({}, '', url.toString())
  }
}

function clearFilter() {
  selectTag(null)
}

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

const allTags = computed(() => {
  const counts = new Map<string, number>()
  posts.value.forEach(post => {
    post.tags?.forEach(tag => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const filteredPosts = computed(() => {
  if (!selectedTag.value) return posts.value
  return posts.value.filter(post => post.tags?.includes(selectedTag.value!))
})

const postGroups = computed(() => {
  const groups = new Map<string, typeof posts.value>()

  filteredPosts.value.forEach(post => {
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

const totalYearsCount = computed(() => {
  const years = new Set(posts.value.map(p => p.date.year))
  return years.size
})

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'Archive',
        summary: (count: number, years: number) =>
          `${count} articles across ${years} years`,
        filteredSummary: (tag: string, count: number) =>
          `${count} articles tagged with #${tag}`,
        all: 'All',
        clearFilter: 'Clear filter',
        emptyTitle: 'No articles found',
        emptyDesc: 'Try choosing another tag or clear the current filter.',
        jumpToYear: 'Jump to year',
        filterByTag: 'Filter by topic',
      }
    : {
        title: '文章归档',
        summary: (count: number, years: number) =>
          `共收录 ${count} 篇文章 · 跨越 ${years} 个年份`,
        filteredSummary: (tag: string, count: number) =>
          `在「#${tag}」标签下共找到 ${count} 篇文章`,
        all: '全部',
        clearFilter: '清除筛选',
        emptyTitle: '未找到匹配文章',
        emptyDesc: '可以尝试切换其他标签，或清除当前的标签筛选。',
        jumpToYear: '跳转至年份',
        filterByTag: '按标签筛选',
      }
)
</script>

<template>
  <main class="archive-index">
    <!-- Header -->
    <header class="archive-header">
      <h1>{{ copy.title }}</h1>
      <div class="archive-summary">
        <p v-if="!selectedTag">
          {{ copy.summary(filteredPosts.length, totalYearsCount) }}
        </p>
        <div v-else class="filtered-status">
          <p>{{ copy.filteredSummary(selectedTag, filteredPosts.length) }}</p>
          <button type="button" class="clear-filter-btn" @click="clearFilter">
            {{ copy.clearFilter }}
          </button>
        </div>
      </div>
    </header>

    <!-- Interactive Filters & Year Navigation -->
    <section class="archive-controls" :aria-label="copy.filterByTag">
      <!-- Tag Pills -->
      <div class="tag-pills-row">
        <button
          type="button"
          class="tag-pill"
          :class="{ 'is-active': selectedTag === null }"
          :aria-pressed="selectedTag === null"
          @click="selectTag(null)">
          <span>{{ copy.all }}</span>
          <span class="pill-count">{{ posts.length }}</span>
        </button>

        <button
          v-for="tag in allTags"
          :key="tag.name"
          type="button"
          class="tag-pill"
          :class="{ 'is-active': selectedTag === tag.name }"
          :aria-pressed="selectedTag === tag.name"
          @click="selectTag(tag.name)">
          <span>#{{ tag.name }}</span>
          <span class="pill-count">{{ tag.count }}</span>
        </button>
      </div>

      <!-- Year Scrubber -->
      <div
        v-if="availableYears.length > 1"
        class="year-scrubber"
        :aria-label="copy.jumpToYear">
        <span class="scrubber-label">{{ copy.jumpToYear }}:</span>
        <div class="scrubber-links">
          <button
            v-for="item in availableYears"
            :key="item.year"
            type="button"
            class="year-jump-btn"
            @click="scrollToYear(item.year)">
            <span>{{ item.year }}</span>
            <span class="year-count">({{ item.count }})</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Empty State -->
    <section v-if="filteredPosts.length === 0" class="archive-empty">
      <h2>{{ copy.emptyTitle }}</h2>
      <p>{{ copy.emptyDesc }}</p>
      <button type="button" class="reset-btn" @click="clearFilter">
        {{ copy.clearFilter }}
      </button>
    </section>

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
        <div v-for="post in yearPosts" :key="post.url" class="post-item">
          <a :href="post.url" class="post-link">
            <time :datetime="dateTime(post.date.time)">
              {{ post.date.monthDay }}
            </time>
            <span class="post-title">{{ post.title }}</span>
          </a>
          <div v-if="post.tags?.length" class="post-item-tags">
            <button
              v-for="tag in post.tags.slice(0, 2)"
              :key="tag"
              type="button"
              class="mini-tag"
              :class="{ 'is-selected': selectedTag === tag }"
              @click.stop="selectTag(tag)">
              #{{ tag }}
            </button>
          </div>
        </div>
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
  margin-bottom: 48px;
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
  margin-top: 20px;
}

.archive-summary p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.6;
}

.filtered-status {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.clear-filter-btn {
  padding: 2px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 9999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

.clear-filter-btn:hover {
  background: var(--boundless-accent-soft);
  border-color: var(--vp-c-brand-1);
}

/* Controls */
.archive-controls {
  margin-bottom: 72px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tag-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-pill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  transition: all 180ms ease;
  user-select: none;
}

.tag-pill:hover {
  border-color: var(--vp-c-border);
  color: var(--vp-c-brand-1);
}

.tag-pill.is-active {
  border-color: var(--vp-c-brand-1);
  background: var(--boundless-accent-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.pill-count {
  font-size: 11px;
  opacity: 0.7;
}

/* Year Scrubber */
.year-scrubber {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 24px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.scrubber-label {
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scrubber-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.year-jump-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--boundless-radius);
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms ease;
}

.year-jump-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.year-count {
  font-size: 10px;
  opacity: 0.7;
}

/* Empty State */
.archive-empty {
  padding: 80px 0;
  text-align: center;
}

.archive-empty h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 24px;
  font-weight: 600;
}

.archive-empty p {
  margin: 12px 0 24px;
  color: var(--vp-c-text-2);
  font-size: 15px;
}

.reset-btn {
  padding: 8px 20px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: var(--boundless-radius);
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.reset-btn:hover {
  opacity: 0.9;
}

/* Timeline */
.archive-year {
  display: grid;
  grid-template-columns: minmax(130px, 1.2fr) minmax(0, 8.8fr);
  gap: clamp(32px, 6vw, 84px);
  align-items: start;
  margin-top: 80px;
  scroll-margin-top: calc(var(--vp-nav-height) + 36px);
}

.year-heading {
  position: sticky;
  top: calc(var(--vp-nav-height) + 36px);
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.year-heading h2 {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.year-badge {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.archive-posts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px clamp(32px, 4vw, 56px);
}

.post-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.post-link {
  display: inline-flex;
  gap: 16px;
  align-items: baseline;
  min-width: 0;
  color: var(--vp-c-text-1);
  font-size: 15px;
  line-height: 1.55;
  text-decoration: none;
}

.post-link time {
  flex-shrink: 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.post-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 180ms ease;
}

.post-link:hover .post-title,
.post-link:focus-visible .post-title {
  color: var(--vp-c-brand-1);
}

.post-item-tags {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.mini-tag {
  padding: 1px 6px;
  border: none;
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 150ms ease;
}

.mini-tag:hover {
  background: var(--boundless-accent-soft);
  color: var(--vp-c-brand-1);
}

.mini-tag.is-selected {
  background: var(--boundless-accent-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

/* Animations */
@media (prefers-reduced-motion: no-preference) {
  .archive-header,
  .archive-controls {
    animation: archive-reveal 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .archive-controls {
    animation-delay: 60ms;
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
    gap: 12px;
  }
}

@media (max-width: 767px) {
  .archive-index {
    padding: calc(var(--vp-nav-height) + 40px) 18px 80px;
  }

  .archive-header {
    margin-bottom: 36px;
  }

  .archive-header h1 {
    font-size: clamp(38px, 12vw, 48px);
  }

  .archive-controls {
    margin-bottom: 48px;
    padding-bottom: 24px;
  }

  .archive-year {
    display: block;
    margin-top: 56px;
  }

  .year-heading {
    position: static;
    margin-bottom: 20px;
  }

  .post-item {
    padding: 8px 0;
  }
}
</style>
