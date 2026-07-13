<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, lang, page } = useData()
const isPost = computed(() => /(^|\/)posts\//.test(page.value.relativePath))
const tags = computed<string[]>(() =>
  Array.isArray(frontmatter.value.tags) ? frontmatter.value.tags : []
)
const date = computed(() => {
  const parsed = new Date(frontmatter.value.date)
  parsed.setUTCHours(12)
  return parsed
})
const dateTime = computed(() =>
  Number.isNaN(date.value.getTime())
    ? undefined
    : date.value.toISOString().slice(0, 10)
)
const displayDate = computed(() => {
  if (!dateTime.value) return ''

  return date.value.toLocaleDateString(
    lang.value.startsWith('en') ? 'en-US' : 'zh-Hans',
    {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }
  )
})
</script>

<template>
  <div v-if="isPost && displayDate" class="article-meta">
    <time :datetime="dateTime">{{ displayDate }}</time>
    <div
      v-if="tags.length"
      :aria-label="lang.startsWith('en') ? 'Tags' : '标签'">
      <span v-for="tag in tags" :key="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style scoped>
.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  align-items: center;
  margin-bottom: 28px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.article-meta > div {
  display: flex;
  flex-wrap: wrap;
}

.article-meta span:not(:last-child)::after {
  margin-right: 0.7em;
  content: ',';
}

@media (max-width: 767px) {
  .article-meta {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 22px;
  }
}
</style>
