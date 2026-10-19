<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
)
const { lang } = useData()
const coverErrors = ref<Record<string, true>>({})
const selectedArtists = ref(new Set<string>())
const artistsExpanded = ref(false)
const cloudElement = ref<HTMLDivElement>()
const isNarrow = ref(false)
const cloudPositions = ref<Record<string, { left: string; top: string }>>({})
const cloudHeight = ref(240)
const artists = computed(() => {
  const counts = new Map<string, number>()

  for (const album of albumCollection.albums) {
    counts.set(album.artist, (counts.get(album.artist) ?? 0) + 1)
  }

  return Array.from(counts, ([name, count]) => ({ name, count }))
})
const visibleArtists = computed(() =>
  isNarrow.value && !artistsExpanded.value
    ? artists.value.filter(
        artist => artist.count > 1 || selectedArtists.value.has(artist.name)
      )
    : artists.value
)
const filteredAlbums = computed(() =>
  selectedArtists.value.size
    ? albums.value.filter(album => selectedArtists.value.has(album.artist))
    : albums.value
)
const isEnglish = computed(() => lang.value.startsWith('en'))
const heading = computed(() =>
  isEnglish.value ? "Albums I've Listened To" : '听过的专辑'
)
const artistGroupLabel = computed(() =>
  isEnglish.value
    ? 'Filter by artist. Multiple artists can be selected.'
    : '按音乐人筛选，可多选'
)
const resultSummary = computed(() => {
  if (!selectedArtists.value.size) {
    return isEnglish.value
      ? `All ${albums.value.length} albums`
      : `全部 ${albums.value.length} 张`
  }

  return isEnglish.value
    ? `${filteredAlbums.value.length} / ${albums.value.length} albums`
    : `显示 ${filteredAlbums.value.length} / ${albums.value.length} 张`
})
const expandLabel = computed(() => {
  if (artistsExpanded.value) return isEnglish.value ? 'Show fewer' : '收起'

  return isEnglish.value
    ? `Show all ${artists.value.length} artists`
    : `展开全部 ${artists.value.length} 位`
})
const coverErrorLabel = computed(() =>
  isEnglish.value ? 'Cover unavailable' : '封面暂不可用'
)
const externalLinkLabel = computed(() =>
  isEnglish.value ? 'Opens in a new window' : '在新窗口打开'
)

function toggleArtist(name: string) {
  if (selectedArtists.value.has(name)) {
    selectedArtists.value.delete(name)
  } else {
    selectedArtists.value.add(name)
  }
}

function artistLabel(name: string, count: number) {
  return isEnglish.value
    ? `${name}, ${count} ${count === 1 ? 'album' : 'albums'}`
    : `${name}，${count} 张专辑`
}

function markCoverError(id: string) {
  coverErrors.value[id] = true
}

// 先放置大词，再沿椭圆螺旋填充空隙。
function layoutCloud() {
  const element = cloudElement.value
  if (!element) return

  const width = element.clientWidth
  const words = Array.from(
    element.querySelectorAll<HTMLButtonElement>('.artist')
  )
    .map((button, index) => ({
      name: visibleArtists.value[index]!.name,
      count: visibleArtists.value[index]!.count,
      width: button.getBoundingClientRect().width,
      height: button.getBoundingClientRect().height,
    }))
    .sort((a, b) => b.count - a.count)
  type Box = { x: number; y: number; width: number; height: number }
  let height = isNarrow.value ? 220 : 240

  for (;;) {
    const placed: Box[] = []
    const positions: Record<string, { left: string; top: string }> = {}

    for (const word of words) {
      for (let step = 0; step < 2400; step++) {
        const angle = step * 0.15
        const radius = (step / 2400) * (height / 2)
        const x = Math.cos(angle) * radius * (width / height)
        const y = Math.sin(angle) * radius
        const box = {
          x: x - word.width / 2,
          y: y - word.height / 2,
          width: word.width,
          height: word.height,
        }
        const edgeX = (Math.abs(x) + word.width / 2 + 4) / (width / 2)
        const edgeY = (Math.abs(y) + word.height / 2 + 4) / (height / 2)

        if (edgeX > 1 || edgeY > 1) continue
        if (!isNarrow.value && edgeX ** 2 + edgeY ** 2 > 1) continue
        if (
          placed.some(
            other =>
              box.x < other.x + other.width + 6 &&
              box.x + box.width + 6 > other.x &&
              box.y < other.y + other.height + 6 &&
              box.y + box.height + 6 > other.y
          )
        ) {
          continue
        }

        placed.push(box)
        positions[word.name] = {
          left: `${box.x + width / 2}px`,
          top: `${box.y + height / 2}px`,
        }
        break
      }

      if (!positions[word.name]) break
    }

    if (placed.length === words.length) {
      cloudPositions.value = positions
      cloudHeight.value = height
      return
    }

    height += 40
  }
}

let cloudObserver: ResizeObserver | undefined
let layoutFrame = 0

function scheduleCloudLayout() {
  if (!cloudElement.value) return
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(layoutCloud)
}

watch(
  () => visibleArtists.value.map(artist => artist.name).join('\n'),
  async () => {
    await nextTick()
    scheduleCloudLayout()
  }
)

onMounted(() => {
  isNarrow.value = window.matchMedia('(max-width: 559px)').matches
  let cloudWidth = 0
  cloudObserver = new ResizeObserver(entries => {
    const width = entries[0]!.contentRect.width
    if (!width || width === cloudWidth) return
    cloudWidth = width
    isNarrow.value = window.matchMedia('(max-width: 559px)').matches
    scheduleCloudLayout()
  })
  cloudObserver.observe(cloudElement.value!)
  void document.fonts.ready.then(scheduleCloudLayout)
})

onUnmounted(() => {
  cloudObserver?.disconnect()
  cancelAnimationFrame(layoutFrame)
})
</script>

<template>
  <main class="album-wall">
    <h1 class="visually-hidden">{{ heading }}</h1>
    <div class="artist-filter">
      <div
        id="album-artists"
        ref="cloudElement"
        class="artist-cloud"
        :class="{ 'is-positioned': Object.keys(cloudPositions).length > 0 }"
        :style="{ '--cloud-height': `${cloudHeight}px` }"
        role="group"
        :aria-label="artistGroupLabel">
        <button
          v-for="artist in visibleArtists"
          :key="artist.name"
          type="button"
          class="artist"
          :class="[
            `artist-weight-${Math.min(artist.count, 4)}`,
            {
              'is-selected': selectedArtists.has(artist.name),
            },
          ]"
          :style="cloudPositions[artist.name]"
          :aria-label="artistLabel(artist.name, artist.count)"
          :aria-pressed="selectedArtists.has(artist.name)"
          @click="toggleArtist(artist.name)">
          <span class="artist-name">{{ artist.name }}</span>
        </button>
      </div>
      <button
        type="button"
        class="expand-artists text-button"
        :aria-expanded="artistsExpanded"
        aria-controls="album-artists"
        @click="artistsExpanded = !artistsExpanded">
        {{ expandLabel }}
      </button>
    </div>

    <div class="filter-summary">
      <p role="status" aria-live="polite" aria-atomic="true">
        {{ resultSummary }}
      </p>
      <button
        v-if="selectedArtists.size"
        type="button"
        class="text-button"
        @click="selectedArtists.clear()">
        {{ isEnglish ? 'Clear filters' : '清除筛选' }}
      </button>
    </div>

    <section class="cover-grid" :aria-label="heading">
      <a
        v-for="(album, index) in filteredAlbums"
        :key="album.id"
        class="album"
        :href="album.url"
        target="_blank"
        rel="noopener noreferrer">
        <figure>
          <div class="album-cover">
            <div
              v-if="coverErrors[album.id]"
              class="cover-error"
              aria-hidden="true">
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
              @error="markCoverError(album.id)" />
          </div>
          <figcaption>
            <span class="album-title-row">
              <span class="album-title">{{ album.title }}</span>
              <span class="external-mark" aria-hidden="true">↗</span>
            </span>
            <span class="album-meta">
              <span class="album-artist">{{ album.artist }}</span>
              <span class="album-year">
                {{ album.releaseDate.slice(0, 4) }}
              </span>
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

.artist-filter,
.filter-summary,
.cover-grid {
  width: min(1280px, 100%);
  margin-inline: auto;
  padding-inline: clamp(24px, 3.5vw, 48px);
}

.artist-filter {
  padding-top: clamp(24px, 3vw, 40px);
  padding-bottom: 16px;
}

.artist-cloud {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 16px;
  width: min(1000px, 100%);
  min-height: 240px;
  margin-inline: auto;
}

.artist-cloud.is-positioned {
  display: block;
  height: var(--cloud-height);
}

.artist-cloud.is-positioned .artist {
  position: absolute;
}

.artist {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  min-height: 32px;
  margin: 0;
  padding: 4px;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
  font-optical-sizing: auto;
  cursor: pointer;
}

.artist-name {
  text-decoration-thickness: 1px;
  text-underline-offset: 5px;
}

.artist-weight-2 {
  color: color-mix(in srgb, var(--text-primary) 65%, var(--text-secondary));
  font-size: 24px;
  font-weight: 500;
}

.artist-weight-3 {
  color: color-mix(in srgb, var(--text-primary) 85%, var(--text-secondary));
  font-size: 32px;
  font-weight: 500;
}

.artist-weight-4 {
  color: var(--text-primary);
  font-size: 46px;
  font-weight: 600;
}

.artist.is-selected {
  color: var(--vp-c-brand-1);
}

.artist.is-selected .artist-name,
.artist:focus-visible .artist-name {
  text-decoration-line: underline;
}

.artist:focus-visible,
.text-button:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.expand-artists {
  display: none;
}

.filter-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
  margin-bottom: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.filter-summary p {
  margin: 0;
}

.text-button {
  min-height: 44px;
  padding: 0;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
}

.cover-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
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
  box-shadow:
    0 0 0 0.5px var(--cover-edge),
    var(--cover-shadow);
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
  .artist:hover {
    color: var(--text-primary);
  }

  .artist.is-selected:hover {
    color: var(--vp-c-brand-1);
  }

  .artist:hover .artist-name,
  .text-button:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
  }

  .album:hover:not(:focus-visible) .album-cover {
    box-shadow:
      0 0 0 0.5px var(--cover-edge),
      var(--cover-hover-shadow);
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

@media (pointer: coarse) {
  .artist {
    min-height: 44px;
  }
}

@media (max-width: 559px) {
  .artist-filter,
  .filter-summary,
  .cover-grid {
    padding-inline: 16px;
  }

  .artist-filter {
    padding-top: 32px;
    padding-bottom: 16px;
  }

  .artist-cloud {
    min-height: 220px;
  }

  .artist {
    min-height: 44px;
    font-size: 14px;
  }

  .artist-weight-2 {
    font-size: 20px;
  }

  .artist-weight-3 {
    font-size: 26px;
  }

  .artist-weight-4 {
    font-size: 34px;
  }

  .expand-artists {
    display: flex;
    align-items: center;
    margin: 8px auto 0;
  }

  .filter-summary {
    margin-bottom: 12px;
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
