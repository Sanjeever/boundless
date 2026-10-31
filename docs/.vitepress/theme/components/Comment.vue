<template>
  <div class="comments" v-if="isPost && !frontmatter.isNoComment">
    <!-- params generate in https://giscus.app/zh-CN -->
    <Giscus
      :key="route.path"
      repo="Sanjeever/boundless"
      repo-id="R_kgDOQw5hOg"
      category="Announcements"
      category-id="DIC_kwDOQw5hOs4C0YIZ"
      mapping="specific"
      :term="term"
      strict="1"
      reactions-enabled="1"
      emit-metadata="0"
      input-position="bottom"
      :theme="theme"
      :lang="lang"
      loading="lazy"
      crossorigin="anonymous" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import Giscus from '@giscus/vue'

const route = useRoute()
const { isDark, frontmatter, page } = useData()
const isPost = computed(() => /(^|\/)posts\//.test(page.value.relativePath))

// 保证中英文路径显示同一个评论
const term = computed(() => route.path.replace(/^\/en\//, '/'))
const theme = computed(() =>
  isDark.value ? 'noborder_dark' : 'noborder_light'
)
const lang = computed(() => (route.path.startsWith('/en/') ? 'en' : 'zh-CN'))
</script>
<style lang="scss" scoped>
.comments {
  margin-top: 80px;
}
</style>
