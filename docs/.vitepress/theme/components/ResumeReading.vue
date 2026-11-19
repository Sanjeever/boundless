<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ path: string }>()
const { lang } = useData()
const key = 'boundless:reading:' + props.path
type Position = { heading: string; offset: number }
const saved = ref<Position>()
const label = ref('')
let article: HTMLElement | null
let headings: HTMLElement[] = []

function save() {
  if (!article?.isConnected) return
  if (article.getBoundingClientRect().bottom <= innerHeight + 1) {
    localStorage.removeItem(key)
    saved.value = undefined
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
})

onBeforeUnmount(() => {
  save()
  window.removeEventListener('scrollend', save)
  window.removeEventListener('pagehide', save)
})
</script>

<template>
  <button v-if="saved" class="resume" type="button" @click="resume">
    {{ lang.startsWith('en') ? 'Continue reading' : '继续阅读' }}
    <template v-if="label">· {{ label }}</template>
  </button>
</template>

<style scoped>
.resume {
  color: var(--vp-c-brand-1);
  text-align: start;
}
.resume:hover {
  text-decoration: underline;
}
</style>
