<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'About Me',
        intro:
          'I’m Sanjeev. I live in Nanning, write code, and build small tools.',
        namePrefix: 'My handle comes from the Sanskrit word ',
        sanskritWord: 'saṃjīva',
        nameMid: '. Flipping through the ',
        dictSanskrit: 'Monier-Williams Sanskrit-English Dictionary',
        nameSuffix:
          ' years ago, I came across its meanings—“living,” “revival,” “bringing to life.” I liked that quiet vitality and kept the name.',
        sitePrefix: 'This site is called ',
        siteName: 'Boundless (无垠)',
        siteMid1: ', another word found in dictionaries: the ',
        dictZh: 'Revised Mandarin Chinese Dictionary',
        siteMid2:
          ' defines 无垠 as “vast and without boundaries,” matching the ',
        dictEn: 'American Heritage Dictionary',
        siteSuffix:
          '’s entry for boundless (“Being without boundaries or limits”). I liked the sound of the word, and the reminder that there is always unfamiliar code and plenty left to figure out.',
        candor:
          'I’m drawn to the candor of Wang Xiaobo’s essays and the lightness and white space of Italo Calvino’s fiction. Grand slogans leave me cold; I care much more about concrete things right in front of me.',
        writing:
          'Most posts here are notes from writing code and building tools, alongside the occasional essay. If something saves you a bit of time, wonderful; if not, treat it as a few loose pages on someone else’s desk.',
        albumsPrefix:
          'Outside of code, I spend a lot of time with music, listening for arrangement and mood rather than lyrics. The ',
        albumsText: 'records wall',
        albumsUrl: '/en/albums',
        albumsMid:
          ' collects full albums I’ve listened through—most of the pre-2020 releases come from middle and high school, a thread I followed in ',
        tasteText: 'Teenage Playlists and Adult Appetites',
        tasteUrl: '/en/posts/2026/10/30-teenage-taste',
        albumsSuffix: '.',
        contact: 'Contact',
        email: 'Email',
      }
    : {
        title: '关于我',
        intro: '我是 Sanjeev，住广西南宁，平时写代码、做小工具。',
        namePrefix: '这个名字取自梵语 ',
        sanskritWord: 'saṃjīva',
        nameMid: '。以前翻',
        dictSanskrit: '《Monier-Williams 梵英词典》',
        nameSuffix:
          '，读到它有“活着、复苏、赋予生机”的意思，喜欢这股生机，就一直用了下来。',
        sitePrefix: '博客叫「',
        siteName: '无垠 Boundless',
        siteMid1: '」，也是翻词典定下的：',
        dictZh: '《重編國語辭典修訂本》',
        siteMid2: '释为“遼遠而無邊際”，',
        dictEn: '《美国传统英语词典》',
        siteSuffix:
          '对 boundless 的解释则是“Being without boundaries or limits”。单纯觉得这个词好看，也提醒自己，没见过的代码和没想通的事还很多。',
        candor:
          '我喜欢王小波杂文里的坦荡，也偏爱卡尔维诺小说的轻盈与留白。比起宏大的口号，我更关心眼前具体的人和事。',
        writing:
          '这里记的大多是写代码、做工具时遇到的真问题，偶尔也写点随笔。要是哪篇恰好帮到了你，自然最好；要是没有，就当翻到了别人桌上的几页便签。',
        albumsPrefix:
          '写代码之余常听音乐。我不太留意歌词，更在意编曲和旋律里的情绪。站里有一面听过整张的',
        albumsText: '唱片墙',
        albumsUrl: '/albums',
        albumsMid: '，2020 年以前的专辑多半来自初高中时期，后来也顺着写过一篇',
        tasteText: '《青春期的歌单与成年后的胃口》',
        tasteUrl: '/posts/2026/10/30-teenage-taste',
        albumsSuffix: '。',
        contact: '联系方式',
        email: '邮箱',
      }
)
</script>

<template>
  <main class="about-paper">
    <header class="about-header">
      <h1 class="about-title">{{ copy.title }}</h1>
      <p class="about-intro">{{ copy.intro }}</p>
      <hr class="head-rule" />
    </header>

    <article class="about-content">
      <p>
        {{ copy.namePrefix }}
        <em class="sanskrit">{{ copy.sanskritWord }}</em>
        {{ copy.nameMid }}
        <a
          href="https://www.tuninst.net/SED-MW/download-prem/s.htm"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.dictSanskrit }}
        </a>
        {{ copy.nameSuffix }}
      </p>

      <p>
        {{ copy.sitePrefix }}
        <strong>{{ copy.siteName }}</strong>
        {{ copy.siteMid1 }}
        <a
          href="https://dict.revised.moe.edu.tw/dictView.jsp?ID=159386&amp;la=0&amp;powerMode=0"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.dictZh }}
        </a>
        {{ copy.siteMid2 }}
        <a
          href="https://www.ahdictionary.com/word/search.html?q=boundless"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.dictEn }}
        </a>
        {{ copy.siteSuffix }}
      </p>

      <p>{{ copy.candor }}</p>

      <p>{{ copy.writing }}</p>

      <p>
        {{ copy.albumsPrefix }}
        <a :href="copy.albumsUrl">{{ copy.albumsText }}</a>
        {{ copy.albumsMid }}
        <a :href="copy.tasteUrl">{{ copy.tasteText }}</a>
        {{ copy.albumsSuffix }}
      </p>
    </article>

    <hr class="head-rule" />

    <footer class="about-footer">
      <span class="footer-label">{{ copy.contact }}:</span>
      <nav class="contact-links" :aria-label="copy.contact">
        <a href="mailto:hi@sanjeev.top" :aria-label="copy.email">
          hi@sanjeev.top
        </a>
        <span class="sep">/</span>
        <a
          href="https://github.com/Sanjeever"
          target="_blank"
          rel="noopener noreferrer">
          GitHub
        </a>
        <span class="sep">/</span>
        <a
          :href="isEnglish ? '/feed-en.xml' : '/feed.xml'"
          target="_blank"
          rel="noopener noreferrer">
          RSS
        </a>
      </nav>
    </footer>
  </main>
</template>

<style scoped>
.about-paper {
  width: min(740px, 100%);
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 48px) clamp(20px, 4vw, 36px) 112px;
}

.about-header {
  margin-bottom: 32px;
}

.about-title {
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
  font-size: clamp(34px, 5vw, 44px);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.about-intro {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 17px;
  line-height: 1.7;
}

.head-rule {
  width: 100%;
  margin: 28px 0 0;
  border: 0;
  height: 1px;
  background-color: var(--vp-c-text-1);
  opacity: 0.12;
}

.about-content p {
  margin: 0 0 24px;
  color: var(--vp-c-text-1);
  font-size: 17px;
  line-height: 1.88;
}

.sanskrit {
  font-style: italic;
  font-family: Georgia, serif;
}

.about-content a,
.contact-links a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: color 150ms ease;
}

.about-content a:hover,
.contact-links a:hover {
  color: var(--vp-c-brand-2);
}

.about-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.footer-label {
  color: var(--vp-c-text-2);
}

.contact-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sep {
  opacity: 0.4;
}

@media (max-width: 640px) {
  .about-paper {
    padding-top: calc(var(--vp-nav-height) + 32px);
  }
}
</style>
