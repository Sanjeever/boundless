<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useData, useRoute } from 'vitepress'
import type { ShareCardData } from '../utils/shareCard'

const ShareCardDialog = defineAsyncComponent(
  () => import('./ShareCardDialog.vue')
)
const { page, frontmatter, lang } = useData()
const route = useRoute()
const toolbar = ref<HTMLElement>()
const visible = ref(false)
const nativePopover = ref(false)
const nativeFocusgroup = ref(false)
const selectedText = ref('')
const card = ref<ShareCardData>()
const position = ref({ left: '0px', top: '0px' })
const feedback = ref('')
const activeButton = ref(0)
const english = computed(() => lang.value.startsWith('en'))
const copy = computed(() =>
  english.value
    ? {
        label: 'Selected text actions',
        copy: 'Copy',
        share: 'Share card',
        copied: 'Copied',
        failed: 'Copy failed',
      }
    : {
        label: '选中文字操作',
        copy: '复制',
        share: '分享卡片',
        copied: '已复制',
        failed: '复制失败',
      }
)
const excluded =
  'pre, table, mjx-container, .mermaid-diagram, button, input, textarea, select, [contenteditable="true"]'
let selectionRange: Range | undefined
let dragging = false
let frame = 0
let feedbackTimer: ReturnType<typeof setTimeout> | undefined
let pointerPress = false

function hide() {
  visible.value = false
  if (nativePopover.value && toolbar.value?.matches(':popover-open'))
    toolbar.value.hidePopover()
  feedback.value = ''
}

function restoreReadingFocus() {
  const node = selectionRange?.startContainer
  const element = node instanceof Element ? node : node?.parentElement
  const target = element?.closest<HTMLElement>('p, li, blockquote, h2, h3, h4')
  if (target) {
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), {
      once: true,
    })
  }
}

async function updateSelection() {
  if (dragging || card.value || pointerPress) return
  if (
    !/(^|\/)posts\//.test(page.value.relativePath) ||
    !matchMedia('(pointer: fine)').matches
  ) {
    hide()
    return
  }
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    if (!toolbar.value?.contains(document.activeElement)) hide()
    return
  }
  const content = document.querySelector('.vp-doc')
  const range = selection.getRangeAt(0).cloneRange()
  if (!content?.contains(range.startContainer)) {
    hide()
    return
  }
  const text = selection.toString().trim()
  if (!content.contains(range.endContainer)) {
    range.setEnd(content, content.childNodes.length)
    if (range.toString().replace(/\s/g, '') !== text.replace(/\s/g, '')) {
      hide()
      return
    }
  }
  if (!text) {
    hide()
    return
  }
  const elements = content.querySelectorAll(excluded)
  if (Array.from(elements).some(element => range.intersectsNode(element))) {
    hide()
    return
  }

  selectionRange = range
  selectedText.value = text.replace(/\r\n/g, '\n')
  visible.value = true
  await nextTick()
  if (!visible.value || card.value || !toolbar.value) return
  if (nativePopover.value && !toolbar.value.matches(':popover-open'))
    toolbar.value.showPopover()
  const rects = Array.from(range.getClientRects()).filter(
    rect => rect.width && rect.height
  )
  const rect = rects.find(rect => rect.bottom > 70 && rect.top < innerHeight)
  if (!rect) {
    hide()
    return
  }
  const box = toolbar.value.getBoundingClientRect()
  const left = Math.max(
    12,
    Math.min(
      rect.left + rect.width / 2 - box.width / 2,
      innerWidth - box.width - 12
    )
  )
  const top =
    rect.top - box.height - 10 >= 70
      ? rect.top - box.height - 10
      : Math.min(
          innerHeight - box.height - 12,
          range.getBoundingClientRect().bottom + 10
        )
  position.value = { left: `${left}px`, top: `${top}px` }
}

function scheduleSelection() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    void updateSelection()
  })
}

function onPointerDown(event: PointerEvent) {
  if (toolbar.value?.contains(event.target as Node)) {
    event.preventDefault()
    pointerPress = true
    return
  }
  if (card.value) return
  dragging = true
  hide()
}

function onPointerUp() {
  dragging = false
  pointerPress = false
  scheduleSelection()
}

function onKeydown(event: KeyboardEvent) {
  if (!visible.value || card.value) return
  const inside = toolbar.value?.contains(document.activeElement)
  if (event.key === 'Escape') {
    if (inside) restoreReadingFocus()
    document.getSelection()?.removeAllRanges()
    hide()
    return
  }
  const buttons = toolbar.value!.querySelectorAll<HTMLButtonElement>('button')
  if (
    event.key === 'Tab' &&
    !event.shiftKey &&
    !inside &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    event.preventDefault()
    buttons[activeButton.value].focus({ preventScroll: true })
  } else if (
    inside &&
    !nativeFocusgroup.value &&
    ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  ) {
    event.preventDefault()
    activeButton.value =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 1
          : (activeButton.value + 1) % 2
    buttons[activeButton.value].focus()
  }
}

async function copySelection() {
  clearTimeout(feedbackTimer)
  try {
    await navigator.clipboard.writeText(selectedText.value)
    feedback.value = copy.value.copied
  } catch {
    feedback.value = copy.value.failed
  }
  feedbackTimer = setTimeout(() => {
    feedback.value = ''
    scheduleSelection()
  }, 1800)
}

function shareSelection(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  button.focus({ preventScroll: true })
  const meta = frontmatter.value
  card.value = {
    text: selectedText.value,
    title: page.value.title,
    source: meta.source,
    url: new URL(route.path, 'https://sanjeev.top').href,
    english: english.value,
  }
}

function closeCard() {
  card.value = undefined
  scheduleSelection()
}

watch(
  () => route.path,
  () => {
    card.value = undefined
    hide()
  }
)

onMounted(() => {
  nativePopover.value = 'showPopover' in HTMLElement.prototype
  nativeFocusgroup.value = 'focusGroup' in HTMLElement.prototype
  document.addEventListener('selectionchange', scheduleSelection)
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('focusout', scheduleSelection)
  window.addEventListener('scroll', scheduleSelection, true)
  window.addEventListener('resize', scheduleSelection)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  clearTimeout(feedbackTimer)
  document.removeEventListener('selectionchange', scheduleSelection)
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointercancel', onPointerUp)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('focusout', scheduleSelection)
  window.removeEventListener('scroll', scheduleSelection, true)
  window.removeEventListener('resize', scheduleSelection)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="toolbar"
      class="selection-tools"
      :popover="nativePopover ? 'manual' : undefined"
      :hidden="!visible"
      :style="position"
      role="toolbar"
      focusgroup="toolbar wrap"
      :aria-label="copy.label">
      <button
        type="button"
        :tabindex="nativeFocusgroup ? undefined : activeButton === 0 ? 0 : -1"
        @focus="activeButton = 0"
        @click="copySelection">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true">
          <rect x="8" y="4" width="12" height="13" rx="2" />
          <path d="M15 20H6a2 2 0 0 1-2-2V9" />
        </svg>
        {{ feedback || copy.copy }}
      </button>
      <button
        type="button"
        :tabindex="nativeFocusgroup ? undefined : activeButton === 1 ? 0 : -1"
        @focus="activeButton = 1"
        @click="shareSelection">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h4" />
        </svg>
        {{ copy.share }}
      </button>
    </div>
    <span class="selection-status" role="status">{{ feedback }}</span>
  </Teleport>
  <ShareCardDialog v-if="card" :card="card" @close="closeCard" />
</template>

<style scoped>
.selection-tools {
  position: fixed;
  inset: auto;
  z-index: 100;
  width: max-content;
  margin: 0;
  padding: 4px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  box-shadow: 0 4px 18px rgb(0 0 0 / 12%);
}

.selection-tools:not([hidden]) {
  display: flex;
  gap: 2px;
}

.selection-tools button {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.selection-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (hover: hover) {
  .selection-tools button:hover {
    background: var(--vp-c-bg-soft);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .selection-tools button {
    transition: opacity 120ms;
  }
  .selection-tools button:active {
    opacity: 0.65;
  }
}
</style>
