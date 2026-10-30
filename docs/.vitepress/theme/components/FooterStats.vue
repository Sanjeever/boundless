<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const { lang, theme, frontmatter, page } = useData()
const copy = computed(() =>
  lang.value.startsWith('en')
    ? {
        trigger: 'Stats',
        period: 'Last 30 days',
        visitors: 'Visitors',
        views: 'Page views',
        details: 'View details',
        loading: 'Loading…',
        error: 'Unable to load stats',
      }
    : {
        trigger: '统计',
        period: '近 30 天',
        visitors: '访客',
        views: '浏览',
        details: '查看详情',
        loading: '加载中…',
        error: '统计暂时无法加载',
      }
)
const shareSlug = 'x4YQK6b3cyHS096q'
const shareUrl = `https://cloud.umami.is/share/${shareSlug}`
const apiBase = 'https://cloud.umami.is/analytics/us/api'
const mounted = ref(false)
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const panelRight = ref(0)
const loading = ref(false)
const failed = ref(false)
const stats = ref<{ visitors: number; pageviews: number }>()
let timer: ReturnType<typeof setInterval> | undefined
let request: AbortController | undefined

async function refresh() {
  if (request) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  failed.value = false

  try {
    const shareResponse = await fetch(`${apiBase}/share/${shareSlug}`, {
      signal: controller.signal,
    })
    if (!shareResponse.ok) throw new Error(`Share: ${shareResponse.status}`)
    const share: { websiteId: string; token: string } =
      await shareResponse.json()
    const query = new URLSearchParams({
      period: '30d',
      timezone: 'Asia/Shanghai',
    })
    const response = await fetch(
      `${apiBase}/websites/${share.websiteId}/stats?${query}`,
      {
        signal: controller.signal,
        headers: {
          'x-umami-share-token': share.token,
          'x-umami-share-context': shareSlug,
        },
      }
    )
    if (!response.ok) throw new Error(`Stats: ${response.status}`)
    stats.value = await response.json()
  } catch (error) {
    if (!controller.signal.aborted) {
      failed.value = true
      console.error('Unable to load Umami stats', error)
    }
  } finally {
    if (request === controller) {
      request = undefined
      loading.value = false
    }
  }
}

function stopRefresh() {
  clearInterval(timer)
  timer = undefined
  request?.abort()
  request = undefined
}

function updateRefresh() {
  stopRefresh()
  if (!open.value || document.hidden) return
  void refresh()
  timer = setInterval(refresh, 60_000)
}

function positionPanel() {
  if (!trigger.value) return
  panelRight.value = Math.min(
    0,
    trigger.value.getBoundingClientRect().right - 224
  )
}

function dismiss(event: Event) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) {
    open.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.preventDefault()
  open.value = false
  trigger.value?.focus()
}

watch(open, async value => {
  updateRefresh()
  if (value) {
    await nextTick()
    positionPanel()
  }
})
watch(
  () => page.value.relativePath,
  () => {
    open.value = false
  }
)

onMounted(() => {
  mounted.value = true
  document.addEventListener('pointerdown', dismiss)
  document.addEventListener('focusin', dismiss)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', updateRefresh)
  window.addEventListener('resize', positionPanel)
})

onUnmounted(() => {
  stopRefresh()
  document.removeEventListener('pointerdown', dismiss)
  document.removeEventListener('focusin', dismiss)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', updateRefresh)
  window.removeEventListener('resize', positionPanel)
})
</script>

<template>
  <Teleport
    v-if="mounted && theme.footer?.message && frontmatter.footer !== false"
    :key="page.relativePath"
    to=".VPFooter .message">
    <span ref="root" class="footer-stats">
      <span class="separator" aria-hidden="true">·</span>
      <button
        ref="trigger"
        type="button"
        aria-controls="footer-stats-panel"
        :aria-expanded="open"
        @click="open = !open">
        {{ copy.trigger }}
      </button>
      <span
        v-if="open"
        id="footer-stats-panel"
        class="panel"
        role="region"
        :aria-label="copy.trigger"
        :style="{ right: `${panelRight}px` }">
        <span class="period">{{ copy.period }}</span>
        <span class="readings" aria-live="polite" :aria-busy="loading">
          <span v-if="failed" class="status">{{ copy.error }}</span>
          <template v-else-if="stats">
            <span class="metric">
              <span>{{ copy.visitors }}</span>
              <span class="value">
                {{ stats.visitors.toLocaleString(lang) }}
              </span>
            </span>
            <span class="metric">
              <span>{{ copy.views }}</span>
              <span class="value">
                {{ stats.pageviews.toLocaleString(lang) }}
              </span>
            </span>
          </template>
          <span v-else class="status">{{ copy.loading }}</span>
        </span>
        <a :href="shareUrl" target="_blank" rel="noopener noreferrer">
          {{ copy.details }}
        </a>
      </span>
    </span>
  </Teleport>
</template>

<style scoped>
.footer-stats {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}

.separator {
  margin-inline: 8px;
}

button {
  position: relative;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

button::before {
  position: absolute;
  inset: -10px -4px;
  content: '';
}

button:hover,
button[aria-expanded='true'] {
  color: var(--vp-c-text-1);
}

.panel {
  position: absolute;
  bottom: calc(100% + 12px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 208px;
  max-width: calc(100vw - 32px);
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--boundless-media-shadow);
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  text-align: left;
  white-space: normal;
}

.period,
.panel a {
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.readings {
  display: grid;
  gap: 6px;
  min-height: 46px;
}

.metric {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.value {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}

.status {
  align-self: center;
}

.panel a {
  align-self: flex-start;
}
</style>
