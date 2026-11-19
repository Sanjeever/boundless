<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { BookmarkIcon } from 'tdesign-icons-vue-next'

const props = defineProps<{ path: string }>()
const { lang } = useData()
const key = 'boundless:reading:' + props.path
type Position = { heading: string; offset: number }
const saved = ref<Position>()
const label = ref('')
let article: HTMLElement | null
let headings: HTMLElement[] = []

function clear() {
  localStorage.removeItem(key)
  saved.value = undefined
}

function save() {
  if (!article?.isConnected) return
  if (article.getBoundingClientRect().bottom <= innerHeight + 1) {
    clear()
    return
  }
  if (scrollY < innerHeight) return
  const heading = headings.find(item => item.getBoundingClientRect().top <= 0)
  const position: Position = {
    heading: heading?.id ?? '',
    offset: -(heading ?? article).getBoundingClientRect().top,
  }
  localStorage.setItem(key, JSON.stringify(position))
}

function resume() {
  if (!saved.value || !article) return
  const target = document.getElementById(saved.value.heading) ?? article
  const offset = saved.value.offset
  saved.value = undefined
  // Removing the control can change the height of the metadata row on mobile.
  requestAnimationFrame(() => {
    window.scrollTo({
      top: scrollY + target.getBoundingClientRect().top + offset,
      behavior: 'instant',
    })
  })
}

onMounted(() => {
  article = document.querySelector('main .vp-doc')
  if (!article) return
  headings = Array.from(
    article.querySelectorAll<HTMLElement>(
      'h2[id], h3[id], h4[id], h5[id], h6[id]'
    )
  ).reverse()
  const raw = localStorage.getItem(key)
  if (raw && !location.hash) {
    const position: Position = JSON.parse(raw)
    const heading = headings.find(item => item.id === position.heading)
    if (!position.heading || heading) {
      saved.value = position
      label.value = heading?.textContent?.trim() ?? ''
    }
  }
  window.addEventListener('scrollend', save)
  window.addEventListener('pagehide', save)
  window.addEventListener('boundless:article-top', clear)
})

onBeforeUnmount(() => {
  save()
  window.removeEventListener('scrollend', save)
  window.removeEventListener('pagehide', save)
  window.removeEventListener('boundless:article-top', clear)
})
</script>

<template>
  <button
    v-if="saved"
    class="resume"
    type="button"
    :title="label || undefined"
    :aria-description="label || undefined"
    @click="resume">
    <BookmarkIcon aria-hidden="true" size="14px" />
    {{ lang.startsWith('en') ? 'Continue reading' : '继续阅读' }}
  </button>
</template>

<style scoped>
.resume {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  margin-inline-start: auto;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 12px;
  white-space: nowrap;
}
.resume:hover,
.resume:focus-visible {
  color: var(--vp-c-brand-1);
}
.resume:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
</style>
