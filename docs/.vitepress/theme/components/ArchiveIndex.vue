<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
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

function dateTime(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}
</script>

<template>
  <main class="archive-index">
    <header class="archive-header">
      <h1>{{ isEnglish ? 'Archive' : '文章归档' }}</h1>
      <p>
        {{
          isEnglish
            ? `${posts.length} articles, grouped by year.`
            : `共 ${posts.length} 篇文章，按年份归档。`
        }}
      </p>
    </header>

    <section
      v-for="[year, yearPosts] in postGroups"
      :id="year"
      :key="year"
      class="archive-year">
      <h2>{{ year }}</h2>
      <div class="archive-posts">
        <a v-for="post in yearPosts" :key="post.url" :href="post.url">
          <span>{{ post.title }}</span>
          <time :datetime="dateTime(post.date.time)">
            {{ post.date.monthDay }}
          </time>
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
  padding: calc(var(--vp-nav-height) + 88px) clamp(24px, 4vw, 48px) 120px;
}

.archive-header {
  max-width: 720px;
  margin-bottom: 104px;
}

.archive-header h1 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(52px, 7vw, 82px);
  font-weight: 640;
  letter-spacing: -0.055em;
  line-height: 1;
}

.archive-header p {
  margin: 24px 0 0;
  color: var(--vp-c-text-2);
  font-size: 17px;
  line-height: 1.7;
}

.archive-year {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(0, 5fr);
  gap: clamp(36px, 7vw, 96px);
  align-items: start;
  margin-top: 96px;
  scroll-margin-top: calc(var(--vp-nav-height) + 32px);
}

.archive-year h2 {
  position: sticky;
  top: calc(var(--vp-nav-height) + 32px);
  margin: 0;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 17px;
  font-weight: 520;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.archive-posts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px clamp(36px, 5vw, 70px);
}

.archive-posts a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: baseline;
  color: var(--vp-c-text-1);
  font-size: 15px;
  line-height: 1.55;
  text-decoration: none;
}

.archive-posts a span {
  transition: color 180ms ease;
}

.archive-posts a:hover span,
.archive-posts a:focus-visible span {
  color: var(--vp-c-brand-1);
}

.archive-posts time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

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

@media (max-width: 767px) {
  .archive-index {
    padding: calc(var(--vp-nav-height) + 52px) 18px 80px;
  }

  .archive-header {
    margin-bottom: 72px;
  }

  .archive-header h1 {
    font-size: 52px;
  }

  .archive-year {
    display: block;
    margin-top: 72px;
  }

  .archive-year h2 {
    position: static;
    margin-bottom: 28px;
  }

  .archive-posts {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
