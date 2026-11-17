<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import { QRCode } from 'tdesign-vue-next/es/qrcode'
import { renderShareCard } from '../utils/shareCard'
import type { ShareCardData } from '../utils/shareCard'

const props = defineProps<{ card: ShareCardData }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const qr = ref<HTMLElement>()
const imageUrl = ref('')
const error = ref('')
const copyFeedback = ref('')
const closing = ref(false)
const titleId = `share-card-${useId()}`
const copy = computed(() =>
  props.card.english
    ? {
        title: 'Share excerpt',
        close: 'Close',
        save: 'Save image',
        copy: 'Copy image',
        copied: 'Copied',
        copyFailed: 'Copy failed',
        preview: 'Card preview',
        loading: 'Generating…',
        failed: 'Could not generate the image. Please try again.',
      }
    : {
        title: '分享卡片',
        close: '关闭',
        save: '保存图片',
        copy: '复制图片',
        copied: '已复制',
        copyFailed: '复制失败',
        preview: '卡片预览',
        loading: '正在生成…',
        failed: '图片生成失败，请重试。',
      }
)
const filename = computed(
  () => `${props.card.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}.png`
)
let disposed = false
let imageBlob: Blob | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let pressedOutside = false

async function closeDialog() {
  if (closing.value) return
  closing.value = true
  await nextTick()
  const animations = dialog.value!.getAnimations({ subtree: true })
  await Promise.allSettled(animations.map(animation => animation.finished))
  if (!disposed) dialog.value!.close()
}

function onBackdropPointer(event: PointerEvent) {
  if ('closedBy' in HTMLDialogElement.prototype) return
  const rect = dialog.value!.getBoundingClientRect()
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  if (event.type === 'pointerdown') pressedOutside = outside
  else {
    if (pressedOutside && outside) void closeDialog()
    pressedOutside = false
  }
}

async function copyImage() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': imageBlob! }),
    ])
    copyFeedback.value = copy.value.copied
  } catch {
    copyFeedback.value = copy.value.copyFailed
  }
  copyTimer = setTimeout(() => {
    copyFeedback.value = ''
  }, 1800)
}

onMounted(async () => {
  dialog.value!.showModal()
  try {
    const blob = await renderShareCard(
      props.card,
      qr.value!.querySelector('canvas')!,
      getComputedStyle(dialog.value!).fontFamily
    )
    if (!disposed) {
      imageBlob = blob
      imageUrl.value = URL.createObjectURL(blob)
    }
  } catch (cause) {
    if (!disposed)
      error.value =
        cause instanceof RangeError ? cause.message : copy.value.failed
  }
})

onUnmounted(() => {
  disposed = true
  clearTimeout(copyTimer)
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="share-dialog"
      closedby="any"
      :data-closing="closing ? '' : undefined"
      :aria-labelledby="titleId"
      @cancel.prevent="closeDialog"
      @pointerdown="onBackdropPointer"
      @pointerup="onBackdropPointer"
      @pointercancel="pressedOutside = false"
      @close="emit('close')">
      <header class="share-header">
        <h2 :id="titleId">{{ copy.title }}</h2>
        <form method="dialog" @submit.prevent="closeDialog">
          <button
            type="submit"
            class="close-button"
            :aria-label="copy.close"
            autofocus>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </form>
      </header>
      <div
        class="share-preview"
        role="region"
        :aria-label="copy.preview"
        tabindex="0"
        :aria-busy="!imageUrl && !error">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="`${card.text}\n— ${card.title}`" />
        <p v-else-if="error" class="share-error" role="alert">{{ error }}</p>
        <p v-else role="status">{{ copy.loading }}</p>
      </div>
      <footer v-if="imageUrl" class="share-footer">
        <span class="copy-status" role="status">{{ copyFeedback }}</span>
        <button type="button" class="copy-button" @click="copyImage">
          {{ copyFeedback || copy.copy }}
        </button>
        <a :href="imageUrl" :download="filename" class="save-button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true">
            <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
          </svg>
          {{ copy.save }}
        </a>
      </footer>
      <div ref="qr" hidden aria-hidden="true">
        <QRCode
          :value="card.url"
          :size="176"
          type="canvas"
          color="#242320"
          bg-color="#faf9f6"
          :borderless="true" />
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.share-dialog {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  box-shadow: 0 24px 80px rgb(0 0 0 / 18%);
  opacity: 0;
  transition-property: opacity, transform, display, overlay;
  transition-duration: 160ms;
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  transition-behavior: allow-discrete;
}

.share-dialog[open] {
  display: flex;
  flex-direction: column;
}

.share-dialog::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
  background: rgb(0 0 0 / 48%);
  backdrop-filter: blur(6px);
  opacity: 0;
  transition-property: opacity, display, overlay;
  transition-duration: 160ms;
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  transition-behavior: allow-discrete;
}

.share-dialog[open]:not([data-closing]),
.share-dialog[open]:not([data-closing])::backdrop {
  opacity: 1;
  transition-duration: 220ms;
}

@starting-style {
  .share-dialog[open]:not([data-closing]),
  .share-dialog[open]:not([data-closing])::backdrop {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .share-dialog {
    transform: translateY(8px) scale(0.98);
  }

  .share-dialog[open]:not([data-closing]) {
    transform: translateY(0) scale(1);
  }

  @starting-style {
    .share-dialog[open]:not([data-closing]) {
      transform: translateY(8px) scale(0.98);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-dialog,
  .share-dialog::backdrop,
  .share-dialog[open]:not([data-closing]),
  .share-dialog[open]:not([data-closing])::backdrop {
    transition-duration: 100ms;
  }
}

.share-header,
.share-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
}

.share-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.close-button {
  display: grid;
  place-items: center;
  min-width: 32px;
  min-height: 32px;
  color: var(--vp-c-text-2);
  border-radius: 6px;
  cursor: pointer;
}

.share-preview {
  min-height: 0;
  margin: 0 24px;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 6px;
}

.share-preview img {
  display: block;
  width: 100%;
  height: auto;
}

.share-preview p {
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.share-preview .share-error {
  color: var(--vp-c-danger-1);
}

.share-footer {
  gap: 10px;
  justify-content: flex-end;
}

.save-button,
.copy-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  color: var(--vp-c-bg);
  background: var(--vp-c-text-1);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.copy-button {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.copy-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (hover: hover) {
  .close-button:hover {
    background: var(--vp-c-bg-soft);
  }
  .save-button:hover,
  .copy-button:hover {
    opacity: 0.85;
  }
}

@media (max-width: 480px) {
  .share-header,
  .share-footer {
    padding: 14px 16px;
  }
  .share-preview {
    margin-inline: 16px;
  }
}
</style>
