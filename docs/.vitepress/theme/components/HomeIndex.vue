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
const featuredPost = computed(() => currentPosts.value[0])
const recentPosts = computed(() => currentPosts.value.slice(1, 7))
const morePosts = computed(() => currentPosts.value.slice(7))

const copy = computed(() =>
  isEnglish.value
    ? {
        description: "Sanjeev's personal blog about learning and life.",
        featured: 'Latest writing',
        recent: 'Recent writing',
        more: 'More writing',
        projects: 'Open-source projects',
        projectDescription:
          'Tools for local workflows, databases, and focused everyday work.',
        albums: 'Albums',
        albumDescription: 'A listening archive built from complete albums.',
        previous: 'Previous',
        next: 'Next',
        pagination: 'Blog pagination',
        openProjects: 'View projects',
        openAlbums: 'View albums',
      }
    : {
        description: 'Sanjeev 的个人博客，记录学习与生活。',
        featured: '最新文章',
        recent: '最近文章',
        more: '更多文章',
        projects: '开源项目',
        projectDescription: '围绕本地工作流、数据库与日常效率构建的小工具。',
        albums: '听过的专辑',
        albumDescription: '一份以完整专辑为单位的个人聆听档案。',
        previous: '上一页',
        next: '下一页',
        pagination: '博客分页',
        openProjects: '查看项目',
        openAlbums: '查看唱片',
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
    <header v-if="currentPage === 1" class="home-intro">
      <div class="intro-copy">
        <h1>{{ isEnglish ? 'Boundless' : '无垠' }}</h1>
        <p>{{ copy.description }}</p>
      </div>
      <img
        class="intro-mark"
        src="/logo.png"
        :alt="isEnglish ? 'Boundless flower mark' : '无垠花瓣标志'"
        width="400"
        height="400" />
    </header>

    <section v-if="featuredPost" class="featured-section">
      <h2>{{ copy.featured }}</h2>
      <article class="featured-post">
        <time :datetime="dateTime(featuredPost.date.time)">
          {{ featuredPost.date.string }}
        </time>
        <h3>
          <a :href="featuredPost.url">{{ featuredPost.title }}</a>
        </h3>
        <div
          v-if="featuredPost.excerpt"
          class="post-summary"
          v-html="featuredPost.excerpt" />
        <div class="post-tags" :aria-label="isEnglish ? 'Tags' : '标签'">
          <span v-for="tag in featuredPost.tags" :key="tag">{{ tag }}</span>
        </div>
      </article>
    </section>

    <section v-if="recentPosts.length" class="recent-section">
      <h2>{{ copy.recent }}</h2>
      <div class="recent-grid">
        <article
          v-for="post in recentPosts"
          :key="post.url"
          class="recent-post">
          <time :datetime="dateTime(post.date.time)">
            {{ post.date.monthDay }}
          </time>
          <h3>
            <a :href="post.url">{{ post.title }}</a>
          </h3>
          <div v-if="post.excerpt" class="post-summary" v-html="post.excerpt" />
        </article>
      </div>
    </section>

    <section v-if="morePosts.length" class="more-section">
      <h2>{{ copy.more }}</h2>
      <div class="more-list">
        <a v-for="post in morePosts" :key="post.url" :href="post.url">
          <span>{{ post.title }}</span>
          <time :datetime="dateTime(post.date.time)">
            {{ post.date.monthDay }}
          </time>
        </a>
      </div>
    </section>

    <section v-if="currentPage === 1" class="site-extras">
      <a class="projects-panel" :href="projectsPath">
        <div>
          <h2>{{ copy.projects }}</h2>
          <p>{{ copy.projectDescription }}</p>
          <span>{{ copy.openProjects }}</span>
        </div>
        <img src="/logo.png" alt="" width="400" height="400" />
      </a>

      <a class="albums-panel" :href="albumsPath">
        <div class="album-covers" aria-hidden="true">
          <img src="/images/albums/jesus-is-king.jpg" alt="" />
          <img src="/images/albums/back-of-me.jpg" alt="" />
          <img src="/images/albums/groupies.jpg" alt="" />
        </div>
        <div>
          <h2>{{ copy.albums }}</h2>
          <p>{{ copy.albumDescription }}</p>
          <span>{{ copy.openAlbums }}</span>
        </div>
      </a>
    </section>

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
  padding: calc(var(--vp-nav-height) + 72px) clamp(24px, 4vw, 48px) 112px;
}

.home-intro {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(220px, 4fr);
  align-items: center;
  min-height: 350px;
  margin-bottom: 112px;
}

.intro-copy h1 {
  max-width: 8ch;
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(64px, 9vw, 108px);
  font-weight: 650;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.intro-copy p {
  max-width: 30ch;
  margin: 28px 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(17px, 1.7vw, 21px);
  line-height: 1.7;
}

.intro-mark {
  justify-self: end;
  width: min(260px, 100%);
  height: auto;
  opacity: 0.9;
  transform: rotate(4deg);
}

section > h2 {
  margin: 0 0 28px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.featured-section {
  margin-bottom: 104px;
}

.featured-post {
  display: grid;
  grid-template-columns: minmax(112px, 1fr) minmax(0, 5fr);
  column-gap: clamp(28px, 5vw, 72px);
  align-items: start;
}

.featured-post > time,
.recent-post > time,
.more-list time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.featured-post > time {
  padding-top: 12px;
}

.featured-post h3 {
  grid-column: 2;
  max-width: 18ch;
  margin: 0;
  font-size: clamp(36px, 4.8vw, 62px);
  font-weight: 620;
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.featured-post h3 a,
.recent-post h3 a,
.more-list a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.featured-post h3 a,
.recent-post h3 a {
  transition: color 180ms ease;
}

.featured-post h3 a:hover,
.recent-post h3 a:hover,
.featured-post h3 a:focus-visible,
.recent-post h3 a:focus-visible {
  color: var(--vp-c-brand-1);
}

.post-summary {
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.75;
}

.featured-post .post-summary {
  grid-column: 2;
  max-width: 62ch;
  margin-top: 26px;
}

.post-summary :deep(p) {
  margin: 0;
}

.post-summary :deep(a) {
  color: inherit;
  text-decoration: none;
}

.post-tags {
  display: flex;
  grid-column: 2;
  flex-wrap: wrap;
  gap: 6px 0;
  margin-top: 20px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.post-tags span:not(:last-child)::after {
  margin-right: 0.7em;
  content: ',';
}

.recent-section {
  margin-bottom: 96px;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 68px clamp(40px, 7vw, 96px);
}

.recent-post h3 {
  margin: 12px 0 0;
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.32;
}

.recent-post .post-summary {
  display: -webkit-box;
  margin-top: 16px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.more-section {
  margin-bottom: 104px;
}

.more-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px clamp(40px, 7vw, 96px);
}

.more-list a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: baseline;
  padding-block: 8px;
  font-size: 16px;
  line-height: 1.55;
}

.more-list a:hover span,
.more-list a:focus-visible span {
  color: var(--vp-c-brand-1);
}

.site-extras {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 18px;
  margin-bottom: 88px;
}

.site-extras > a {
  position: relative;
  display: grid;
  min-height: 310px;
  overflow: hidden;
  border-radius: var(--boundless-radius);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.site-extras > a:hover,
.site-extras > a:focus-visible {
  transform: translateY(-3px);
}

.projects-panel {
  align-items: end;
  padding: clamp(28px, 4vw, 44px);
  background: var(--boundless-accent-soft);
}

.projects-panel > div {
  position: relative;
  z-index: 1;
  max-width: 26ch;
}

.projects-panel img {
  position: absolute;
  top: -76px;
  right: -74px;
  width: 250px;
  height: auto;
  opacity: 0.32;
  transform: rotate(10deg);
}

.projects-panel img,
.album-covers img {
  pointer-events: none;
}

.site-extras h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 620;
  letter-spacing: -0.03em;
}

.site-extras p {
  margin: 14px 0 28px;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.site-extras span {
  color: var(--vp-c-brand-1);
  font-size: 14px;
  font-weight: 600;
}

.albums-panel {
  grid-template-columns: minmax(0, 1.25fr) minmax(180px, 0.75fr);
  align-items: center;
  gap: clamp(24px, 3vw, 42px);
  padding: clamp(24px, 3vw, 36px);
  background: var(--vp-c-bg-soft);
}

.album-covers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
}

.album-covers img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--boundless-radius);
  object-fit: cover;
  box-shadow: var(--boundless-media-shadow);
}

.album-covers img:nth-child(2) {
  position: relative;
  z-index: 1;
  transform: scale(1.08) rotate(2deg);
}

.album-covers img:first-child {
  transform: rotate(-4deg);
}

.album-covers img:last-child {
  transform: rotate(5deg);
}

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
}

.page-numbers a[aria-current='page'] {
  background: var(--boundless-accent-soft);
  font-weight: 650;
}

@media (prefers-reduced-motion: no-preference) {
  .home-intro,
  .featured-section {
    animation: home-reveal 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
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

@media (max-width: 767px) {
  .home-index {
    padding: calc(var(--vp-nav-height) + 48px) 18px 72px;
  }

  .home-intro {
    grid-template-columns: minmax(0, 1fr) 104px;
    min-height: 230px;
    margin-bottom: 72px;
  }

  .intro-copy h1 {
    font-size: clamp(48px, 16vw, 68px);
  }

  .intro-copy p {
    margin-top: 18px;
    font-size: 16px;
  }

  .intro-mark {
    width: 104px;
  }

  .featured-section,
  .recent-section,
  .more-section {
    margin-bottom: 72px;
  }

  .featured-post {
    display: block;
  }

  .featured-post > time {
    display: block;
    padding-top: 0;
  }

  .featured-post h3 {
    margin-top: 14px;
    font-size: clamp(32px, 9.6vw, 42px);
    line-height: 1.13;
  }

  .featured-post .post-summary {
    margin-top: 22px;
  }

  .post-tags {
    margin-top: 18px;
  }

  .recent-grid,
  .more-list,
  .site-extras {
    grid-template-columns: 1fr;
  }

  .recent-grid {
    gap: 48px;
  }

  .recent-post:first-child {
    grid-row: auto;
    padding-right: 0;
  }

  .more-list {
    gap: 12px;
  }

  .site-extras {
    margin-bottom: 72px;
  }

  .site-extras > a {
    min-height: 270px;
  }

  .albums-panel {
    grid-template-columns: 1fr;
  }

  .album-covers {
    max-width: 360px;
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
    grid-template-columns: minmax(0, 1fr) 82px;
  }

  .intro-mark {
    width: 82px;
  }

  .featured-post h3 {
    font-size: 34px;
  }

  .site-extras > a {
    min-height: 250px;
  }
}
</style>
