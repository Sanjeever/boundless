<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ source: string }>()
const { isDark, lang } = useData()
const container = ref<HTMLElement>()
const svg = ref('')
const error = ref('')
const id = `mermaid-${useId()}`
let renderCount = 0

onMounted(() => {
  watch(
    [() => props.source, isDark],
    async ([source, dark], _, onCleanup) => {
      let active = true
      onCleanup(() => {
        active = false
      })
      error.value = ''

      try {
        const [{ default: mermaid }] = await Promise.all([
          import('mermaid'),
          document.fonts.ready,
        ])
        if (!active) return

        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: dark ? 'dark' : 'default',
          look: 'classic',
          fontFamily: getComputedStyle(container.value!).fontFamily,
          flowchart: { useMaxWidth: false, wrappingWidth: 320 },
        })
        const result = await mermaid.render(`${id}-${++renderCount}`, source)
        if (active) svg.value = result.svg
      } catch (cause) {
        if (active) {
          svg.value = ''
          error.value = cause instanceof Error ? cause.message : String(cause)
        }
      }
    },
    { immediate: true }
  )
})
</script>

<template>
  <div
    ref="container"
    class="mermaid-diagram"
    role="region"
    :aria-label="lang.startsWith('zh') ? 'Mermaid 图表' : 'Mermaid diagram'"
    tabindex="0">
    <pre v-if="error" role="alert">{{ error }}</pre>
    <div v-else v-html="svg" />
  </div>
</template>

<style scoped>
.mermaid-diagram {
  margin: 24px 0;
  overflow-x: auto;
}

.mermaid-diagram:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.mermaid-diagram :deep(svg) {
  display: block;
  max-width: none;
  margin-inline: auto;
}

.mermaid-diagram :deep(p) {
  line-height: inherit;
}

.mermaid-diagram pre {
  color: var(--vp-c-danger-1);
  white-space: pre-wrap;
}
</style>
