<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import albumCollection from '../../data/albums.json'

type Album = {
  id: string
  title: string
  artist: string
  cover: string
}

const albums = albumCollection.albums as Album[]
const { isDark, lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const heading = computed(() => (isEnglish.value ? "Albums I've Listened To" : '听过的专辑'))
const albumSummary = computed(() =>
  isEnglish.value
    ? `${albums.length} albums and counting`
    : `${albums.length} 张专辑，仍在继续`,
)

function getCoverAlt(album: Album) {
  return isEnglish.value
    ? `${album.artist} - ${album.title} album cover`
    : `${album.artist}《${album.title}》专辑封面`
}
</script>

<template>
  <main class="album-wall" :class="{ 'album-wall--dark': isDark }">
    <header class="wall-header">
      <h1>{{ heading }}</h1>
      <p>{{ albumSummary }}</p>
    </header>

    <section class="cover-grid" :aria-label="heading">
      <figure
        v-for="(album, index) in albums"
        :key="album.id"
        class="album"
        :style="{ animationDelay: `${Math.min(index * 30, 180)}ms` }"
      >
        <div class="album-cover">
          <img
            :src="album.cover"
            :alt="getCoverAlt(album)"
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>
          <span class="album-title">{{ album.title }}</span>
          <span class="album-artist">{{ album.artist }}</span>
        </figcaption>
      </figure>
    </section>
  </main>
</template>

<style scoped>
.album-wall {
  --wall-background: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --cover-placeholder: #e8e8ed;
  --cover-edge: rgb(0 0 0 / 8%);
  --cover-shadow: 0 2px 5px rgb(0 0 0 / 6%), 0 12px 28px rgb(0 0 0 / 8%);
  width: 100vw;
  min-height: 100dvh;
  margin-left: calc(50% - 50vw);
  color: var(--text-primary);
  color-scheme: light;
  background: var(--wall-background);
  transition:
    color 300ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.album-wall--dark {
  --wall-background: #101012;
  --text-primary: #f5f5f7;
  --text-secondary: #a1a1a6;
  --cover-placeholder: #242426;
  --cover-edge: rgb(255 255 255 / 10%);
  --cover-shadow: 0 16px 36px rgb(0 0 0 / 32%);
  color-scheme: dark;
}

.wall-header,
.cover-grid {
  width: min(1280px, 100%);
  margin-inline: auto;
  padding-inline: clamp(24px, 3.5vw, 48px);
}

.wall-header {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding-top: calc(var(--vp-nav-height) + clamp(48px, 7vw, 88px));
  padding-bottom: clamp(52px, 6vw, 80px);
  animation: header-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.wall-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--vp-font-family-base);
  font-size: clamp(44px, 6vw, 72px);
  font-weight: 620;
  line-height: 1;
  letter-spacing: -0.035em;
  font-optical-sizing: auto;
}

.wall-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.cover-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: clamp(24px, 2.5vw, 32px);
  row-gap: clamp(44px, 5vw, 64px);
  padding-bottom: clamp(80px, 10vw, 144px);
}

.album {
  min-width: 0;
  margin: 0;
  animation: album-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 10px;
  background: var(--cover-placeholder);
  box-shadow: 0 0 0 0.5px var(--cover-edge), var(--cover-shadow);
  transform: translateZ(0);
}

.album-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.002);
}

.album figcaption {
  display: grid;
  gap: 2px;
  margin-top: 14px;
  padding-inline: 1px;
}

.album-artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-title {
  display: -webkit-box;
  min-height: 2.6em;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.album-artist {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
}

@keyframes header-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes album-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 1199px) {
  .cover-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 24px;
  }
}

@media (max-width: 719px) {
  .wall-header,
  .cover-grid {
    padding-inline: 16px;
  }

  .wall-header {
    gap: 8px;
    padding-top: calc(var(--vp-nav-height) + 32px);
    padding-bottom: 40px;
  }

  .wall-header h1 {
    font-size: 40px;
  }

  .wall-header p {
    font-size: 14px;
  }

  .cover-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 12px;
    row-gap: 36px;
    padding-bottom: 64px;
  }

  .album-cover {
    border-radius: 10px;
  }

  .album figcaption {
    gap: 2px;
    margin-top: 10px;
  }

  .album-title {
    font-size: 14px;
  }

  .album-artist {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-wall {
    transition: none;
  }

  .wall-header,
  .album {
    animation: none;
  }
}
</style>
