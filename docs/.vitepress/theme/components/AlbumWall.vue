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
const albumCount = computed(() =>
  isEnglish.value ? `${albums.length} albums` : `${albums.length} 张`,
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
      <p>{{ albumCount }}</p>
    </header>

    <section class="cover-grid" :aria-label="heading">
      <figure v-for="album in albums" :key="album.id" class="album">
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
  --cover-edge: rgb(0 0 0 / 7%);
  --cover-shadow: 0 1px 2px rgb(0 0 0 / 6%), 0 12px 32px rgb(52 52 58 / 8%);
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
  --wall-background: #111113;
  --text-primary: #f5f5f7;
  --text-secondary: #98989d;
  --cover-placeholder: #242426;
  --cover-edge: rgb(255 255 255 / 10%);
  --cover-shadow: 0 1px 2px rgb(0 0 0 / 28%), 0 16px 36px rgb(0 0 0 / 24%);
  color-scheme: dark;
}

.wall-header,
.cover-grid {
  width: min(1440px, 100%);
  margin-inline: auto;
  padding-inline: clamp(24px, 4vw, 64px);
}

.wall-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: calc(var(--vp-nav-height) + clamp(48px, 7vw, 88px));
  padding-bottom: clamp(32px, 4vw, 52px);
}

.wall-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--vp-font-family-base);
  font-size: clamp(34px, 4vw, 52px);
  font-weight: 620;
  line-height: 1.05;
  letter-spacing: -0.035em;
}

.wall-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.cover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(190px, 100%), 1fr));
  column-gap: clamp(20px, 2.2vw, 32px);
  row-gap: clamp(32px, 4vw, 52px);
  padding-bottom: clamp(80px, 10vw, 144px);
}

.album {
  min-width: 0;
  margin: 0;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 12px;
  background: var(--cover-placeholder);
  box-shadow: 0 0 0 0.5px var(--cover-edge), var(--cover-shadow);
  transform: translateZ(0);
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

.album-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.002);
  transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
}

.album figcaption {
  display: grid;
  gap: 3px;
  margin-top: 14px;
  padding-inline: 1px;
}

.album-title,
.album-artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 540;
  line-height: 1.35;
  letter-spacing: -0.012em;
}

.album-artist {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.35;
}

@media (hover: hover) and (pointer: fine) {
  .album:hover .album-cover {
    transform: translate3d(0, -3px, 0);
  }

  .album:hover .album-cover img {
    transform: scale(1.025);
  }
}

@media (max-width: 719px) {
  .wall-header,
  .cover-grid {
    padding-inline: 16px;
  }

  .wall-header {
    padding-top: calc(var(--vp-nav-height) + 32px);
    padding-bottom: 28px;
  }

  .wall-header h1 {
    font-size: 32px;
  }

  .cover-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 12px;
    row-gap: 28px;
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
    font-size: 13px;
  }

  .album-artist {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-wall,
  .album-cover,
  .album-cover img {
    transition: none;
  }
}
</style>
