<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import albumCollection from '../../data/albums.json'

type Album = {
  id: string
  title: string
  artist: string
  releaseDate: string
  url: string
  cover: string
}

const albums = computed(() =>
  (albumCollection.albums as Album[])
    .slice()
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
)
const { lang } = useData()
const coverErrors = ref<Record<string, true>>({})
const isEnglish = computed(() => lang.value.startsWith('en'))
const heading = computed(() => (isEnglish.value ? "Albums I've Listened To" : '听过的专辑'))
const releaseYears = computed(() =>
  albums.value.map((album) => album.releaseDate.slice(0, 4)),
)
const archiveLabel = computed(() => {
  const range = `${releaseYears.value.at(-1)}-${releaseYears.value[0]}`

  return isEnglish.value
    ? `Listening archive · ${range}`
    : `个人聆听档案 · ${range}`
})
const albumSummary = computed(() =>
  isEnglish.value
    ? `${albums.value.length} albums listened to, remembered, and counting`
    : `${albums.value.length} 张完整听过、愿意记住的专辑`,
)
const coverErrorLabel = computed(() =>
  isEnglish.value ? 'Cover unavailable' : '封面暂不可用',
)
const externalLinkLabel = computed(() =>
  isEnglish.value ? 'Opens in a new window' : '在新窗口打开',
)

function markCoverError(id: string) {
  coverErrors.value[id] = true
}
</script>

<template>
  <main class="album-wall">
    <header class="wall-header">
      <p class="archive-label">{{ archiveLabel }}</p>
      <h1 :class="{ 'is-english': isEnglish }">{{ heading }}</h1>
      <p class="album-summary">{{ albumSummary }}</p>
    </header>

    <section class="cover-grid" :aria-label="heading">
      <a
        v-for="(album, index) in albums"
        :key="album.id"
        class="album"
        :href="album.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <figure>
          <div class="album-cover">
            <div
              v-if="coverErrors[album.id]"
              class="cover-error"
              aria-hidden="true"
            >
              <span class="cover-error-title">{{ album.title }}</span>
              <span class="cover-error-artist">{{ album.artist }}</span>
              <span class="cover-error-label">{{ coverErrorLabel }}</span>
            </div>
            <img
              v-else
              :src="`/images/albums/${album.id}.jpg`"
              alt=""
              :loading="index < 5 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : undefined"
              decoding="async"
              draggable="false"
              @error="markCoverError(album.id)"
            />
          </div>
          <figcaption>
            <span class="album-title-row">
              <span class="album-title">{{ album.title }}</span>
              <span class="external-mark" aria-hidden="true">↗</span>
            </span>
            <span class="album-meta">
              <span class="album-artist">{{ album.artist }}</span>
              <span class="album-year">{{ album.releaseDate.slice(0, 4) }}</span>
            </span>
            <span class="visually-hidden">{{ externalLinkLabel }}</span>
          </figcaption>
        </figure>
      </a>
    </section>
  </main>
</template>

<style scoped>
.album-wall {
  --wall-background: var(--vp-c-bg);
  --text-primary: var(--vp-c-text-1);
  --text-secondary: var(--vp-c-text-2);
  --cover-placeholder: var(--vp-c-bg-soft);
  --cover-edge: rgb(0 0 0 / 8%);
  --cover-shadow: 0 1px 2px rgb(0 0 0 / 8%), 0 8px 24px rgb(0 0 0 / 6%);
  --cover-hover-shadow: 0 14px 32px rgb(0 0 0 / 14%);
  width: 100%;
  min-height: 100dvh;
  color: var(--text-primary);
  color-scheme: light;
  background: var(--wall-background);
  transition:
    color 300ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

:global(.dark .album-wall) {
  --wall-background: var(--vp-c-bg);
  --text-primary: var(--vp-c-text-1);
  --text-secondary: var(--vp-c-text-2);
  --cover-placeholder: var(--vp-c-bg-soft);
  --cover-edge: rgb(255 255 255 / 10%);
  --cover-shadow: 0 1px 2px rgb(0 0 0 / 20%), 0 8px 24px rgb(0 0 0 / 18%);
  --cover-hover-shadow: 0 14px 32px rgb(0 0 0 / 30%);
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
  gap: 10px;
  padding-top: calc(var(--vp-nav-height) + clamp(40px, 5vw, 64px));
  padding-bottom: clamp(40px, 4vw, 48px);
  animation: header-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.archive-label {
  margin: 0 0 2px;
  color: var(--vp-c-brand-1);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
}

.wall-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--vp-font-family-base);
  font-size: clamp(42px, 5vw, 64px);
  font-weight: 620;
  line-height: 1;
  letter-spacing: -0.035em;
  font-optical-sizing: auto;
}

.wall-header h1.is-english {
  max-width: 14ch;
}

.album-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.cover-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(200px, calc(50% - 6px)), 1fr)
  );
  column-gap: clamp(18px, 2vw, 24px);
  row-gap: clamp(36px, 4vw, 48px);
  padding-bottom: clamp(80px, 10vw, 144px);
}

.album {
  display: block;
  min-width: 0;
  margin: 0;
  text-decoration: none;
}

.album:focus-visible {
  outline: none;
}

.album:focus-visible .album-cover {
  box-shadow:
    0 0 0 2px var(--wall-background),
    0 0 0 4px var(--vp-c-brand-1),
    var(--cover-hover-shadow);
  transform: translateY(-2px);
}

.album figure {
  margin: 0;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--boundless-radius);
  background: var(--cover-placeholder);
  box-shadow: 0 0 0 0.5px var(--cover-edge), var(--cover-shadow);
  transform: translateZ(0);
  transition:
    box-shadow 260ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.album-cover img {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: cover;
  transform: scale(1.002);
  user-select: none;
}

.cover-error {
  display: grid;
  align-content: end;
  width: 100%;
  height: 100%;
  padding: clamp(14px, 2vw, 20px);
  color: var(--text-primary);
  background: var(--cover-placeholder);
}

.cover-error-title,
.cover-error-artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-error-title {
  font-size: 14px;
  font-weight: 600;
}

.cover-error-artist,
.cover-error-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.cover-error-artist {
  margin-top: 2px;
}

.cover-error-label {
  margin-top: 12px;
}

.album figcaption {
  display: grid;
  margin-top: 12px;
  padding-inline: 1px;
}

.album-title-row,
.album-meta {
  display: flex;
  min-width: 0;
}

.album-title-row {
  align-items: flex-start;
}

.album-meta {
  align-items: baseline;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
}

.album-artist {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-title {
  display: -webkit-box;
  min-width: 0;
  min-height: 2.6em;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.album-year {
  flex: none;
}

.album-year::before {
  margin-inline: 0.45em;
  content: '·';
}

.external-mark {
  flex: none;
  margin: 0.05em 0 0 0.4em;
  color: var(--text-secondary);
  font-size: 0.9em;
  opacity: 0.48;
  transform: translate3d(-2px, 2px, 0);
  transition:
    color 220ms ease,
    opacity 220ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.album-title {
  transition: color 220ms ease;
}

.album:focus-visible .album-title,
.album:focus-visible .external-mark {
  color: var(--vp-c-brand-1);
}

.album:focus-visible .external-mark {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (hover: hover) and (pointer: fine) {
  .album:hover:not(:focus-visible) .album-cover {
    box-shadow: 0 0 0 0.5px var(--cover-edge), var(--cover-hover-shadow);
    transform: translateY(-2px) scale(1.005);
  }

  .album:hover .album-title,
  .album:hover .external-mark {
    color: var(--vp-c-brand-1);
  }

  .album:hover .external-mark {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
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

@media (max-width: 559px) {
  .wall-header,
  .cover-grid {
    padding-inline: 16px;
  }

  .wall-header {
    gap: 8px;
    padding-top: calc(var(--vp-nav-height) + 32px);
    padding-bottom: 30px;
  }

  .wall-header h1 {
    font-size: 38px;
  }

  .wall-header h1.is-english {
    max-width: 12ch;
    font-size: 34px;
  }

  .album-summary {
    font-size: 14px;
  }

  .cover-grid {
    column-gap: 12px;
    row-gap: 32px;
    padding-bottom: 64px;
  }

  .album-cover {
    border-radius: var(--boundless-radius);
  }

  .album figcaption {
    gap: 2px;
    margin-top: 10px;
  }

  .album-title {
    font-size: 13px;
  }

  .album-meta {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-wall {
    transition: none;
  }

  .wall-header {
    animation: none;
  }

  .album-cover,
  .album-title,
  .external-mark {
    transition: none;
  }

  .album:hover .album-cover,
  .album:focus-visible .album-cover,
  .album:hover .external-mark,
  .album:focus-visible .external-mark {
    transform: none;
  }
}
</style>
