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
        nameMid: '. Looking it up in the ',
        dictSanskrit: 'Monier-Williams Sanskrit-English Dictionary',
        nameSuffix:
          ', I was drawn to its meanings of “living,” “revival,” and “bringing to life”—a stubborn vitality that stuck with me ever since.',
        sitePrefix: 'This site is named ',
        siteName: 'Boundless (无垠)',
        siteMid1: '. The name came from browsing dictionaries: the ',
        dictZh: 'Revised Mandarin Chinese Dictionary',
        siteMid2: ' defines it as “vast and without boundaries,” echoing the ',
        dictEn: 'American Heritage Dictionary',
        siteSuffix:
          '’s entry for boundless (“Being without boundaries or limits”). It isn’t a grand statement—I just liked the word, and it’s a good reminder that there is always unfamiliar code and plenty of things left to figure out.',
        candor:
          'I’m drawn to the plain-spoken candor and pursuit of wisdom in Wang Xiaobo’s essays, the lightness of Italo Calvino’s fiction, and a clean, scientific aesthetic. I distrust grand narratives, care about concrete things over abstractions, and have a hard time staying in dull, lifeless environments. In an era saturated with hollow buzzwords and AI slop, I prefer keeping things grounded—documenting tangible issues encountered while writing code or building tools, and how they were worked out.',
        writing:
          'Blogging easily turns into self-indulgence, so I try to stay grounded by writing down exact conditions, thoughts, and reproducible steps. If something here saves you a bit of troubleshooting time, wonderful. If not, treat it simply as someone else’s raw engineering notes.',
        albumsPrefix:
          'Outside of programming, I spend a lot of time with music, listening for composition and emotional texture rather than lyrics. There is a ',
        albumsText: 'records wall',
        albumsUrl: '/en/albums',
        albumsMid:
          ' here tracking full-length albums I’ve listened through—most of the pre-2020 releases come from my middle and high school years, a thread I explored further in ',
        tasteText: 'Teenage Playlists and Adult Appetites',
        tasteUrl: '/en/posts/2026/10/30-teenage-taste',
        albumsSuffix: '.',
        contact: 'Contact',
        email: 'Email',
      }
    : {
        title: '关于我',
        intro: '我是 Sanjeev，现居广西南宁，平时写代码、折腾工具。',
        namePrefix: '这个 ID 取自梵语 ',
        sanskritWord: 'saṃjīva',
        nameMid: '。当年翻',
        dictSanskrit: '《Monier-Williams 梵英词典》',
        nameSuffix:
          '看到释义里有“活着、复苏、赋予生机”，喜欢这股不肯僵死的生气，就一直用了下来。',
        sitePrefix: '博客叫「',
        siteName: '无垠 Boundless',
        siteMid1: '」，名字也是翻词典定下的：',
        dictZh: '《重編國語辭典修訂本》',
        siteMid2: '说它是“遼遠而無邊際”，对应',
        dictEn: '《美国传统英语词典》',
        siteSuffix:
          '对 boundless 的释义“Being without boundaries or limits”。倒不是要把话说得很大，单纯觉得这个词顺眼，也顺便提醒自己：没见过的代码和没折腾明白的问题还多得很。',
        candor:
          '喜欢王小波杂文里的坦荡与对智慧的追求，也偏爱卡尔维诺小说里的轻盈，审美上倾向干净利落的“理科”质感。我不喜欢宏大叙事，更愿意关心具体的事物，也很难在无聊无趣的环境里待下去。在到处都在量产空洞通稿和 AI Slop 的当下，这里尽量做点朴素的事，记录平时写代码、做工具遇到的具体问题，以及怎么把它们解决掉。',
        writing:
          '写博客容易变成自说自话，我尽量写得实在点，把当时的环境、排查思路和验证过程交代清楚。内容要是碰巧帮到了正在查资料的你，自然最好；要是没帮上，就当翻看了一篇别人的现场工作便签。',
        albumsPrefix:
          '除了写代码，平时也经常听歌。我听音乐不太在意歌词，更看重曲子本身和旋律传递的情绪，这里整理了一面听过整张的',
        albumsText: '唱片墙',
        albumsUrl: '/albums',
        albumsMid:
          '，其中 2020 年以前的唱片大多来自初高中时期，顺着这个话题也写过一篇',
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
