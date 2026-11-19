<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const visible = ref(false)

function update() {
  visible.value = window.scrollY >= window.innerHeight
}

function goToTop() {
  const title = document.querySelector<HTMLElement>('main .vp-doc h1')
  title?.setAttribute('tabindex', '-1')
  title?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
  window.dispatchEvent(new Event('boundless:article-top'))
}

function onMobileClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return
  const control = event.target.closest(
    '.VPLocalNavOutlineDropdown .top-link, .VPLocalNavOutlineDropdown > button'
  )
  if (!control || control.querySelector('.menu-text')) return
  event.preventDefault()
  goToTop()
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  document.addEventListener('click', onMobileClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
  document.removeEventListener('click', onMobileClick)
})
</script>

<template>
  <button v-if="visible" type="button" class="article-top" @click="goToTop">
    <span aria-hidden="true">↑</span>
    {{ lang.startsWith('en') ? 'Return to top' : '回到顶部' }}
  </button>
</template>

<style scoped>
.article-top {
  margin: 8px 0 0 16px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 28px;
}
.article-top:hover {
  color: var(--vp-c-text-1);
}
</style>
