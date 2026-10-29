<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'About Me',
        intro: 'I’m Sanjeev. I live in Nanning and write code.',
        namePrefix: 'My handle comes from the Sanskrit word ',
        sanskritWord: 'saṃjīva',
        nameMid: '. Looking it up in the ',
        dictionary: 'Monier-Williams Sanskrit-English Dictionary',
        nameMeaning:
          ', I was drawn to its meanings of “living,” “revival,” and “bringing to life.” That sense of vitality stuck with me, and I’ve used the name ever since.',
        blogIntro:
          'This site is called 无垠 (Boundless). The name came from browsing dictionaries: the ',
        chineseDictionary: 'Revised Mandarin Chinese Dictionary',
        chineseMeaning:
          ' defines 無垠 as “vast and without boundaries,” mirroring the ',
        englishDictionary: 'American Heritage Dictionary',
        englishMeaning:
          '’s entry for boundless (“Being without boundaries or limits”). It isn’t meant as a grand claim—just a reminder that there’s always unfamiliar code to read and questions left to figure out.',
        writing:
          'I mostly write about three things here: bugs and friction from building small tools, interesting things I read, and problems I haven’t resolved yet. Rather than dressing experiments up as achievements, I try to leave verifiable details.',
        closingPrefix:
          'I appreciate Wang Xiaobo’s plain-spoken candor in his essays. Outside of coding, I also keep a ',
        albumsText: 'records wall',
        albumsUrl: '/en/albums',
        closingSuffix:
          '. If something here saves you a little debugging time or gives you a moment to think, it was worth putting down.',
        contact: 'Contact',
        email: 'Email',
      }
    : {
        title: '关于我',
        intro: '我是 Sanjeev，现居南宁，平时写代码。',
        namePrefix: '这个 ID 取自梵语 ',
        sanskritWord: 'saṃjīva',
        nameMid: '。当年翻',
        dictionary: '《Monier-Williams 梵英词典》',
        nameMeaning:
          '，看到它有“活着、复苏、赋予生机”的意思，喜欢这股生气，就一直用到了现在。',
        blogIntro: '博客叫「无垠 Boundless」，名字也是翻词典定下来的：',
        chineseDictionary: '《重編國語辭典修訂本》',
        chineseMeaning: '说“無垠”是“遼遠而無邊際”，对应',
        englishDictionary: '《美国传统英语词典》',
        englishMeaning:
          '对 boundless 的释义“Being without boundaries or limits”。倒不是要把话说得很大，更像是个提醒：世界还大，总有没读过的代码和没想明白的问题。',
        writing:
          '这里主要记三件事：写工具踩过的坑、日常读到的好东西，以及暂时还没答案的困惑。不把折腾包装成大成果，尽量留下可复现的细节。',
        closingPrefix:
          '喜欢王小波写杂文的那股坦率劲。代码之外，这里还有一面个人',
        albumsText: '唱片墙',
        albumsUrl: '/albums',
        closingSuffix:
          '。如果某篇记录恰好帮你省了点排查时间，或者让你多琢磨了一会儿，那就没白写。',
        contact: '联系我',
        email: '邮箱',
      }
)
</script>

<template>
  <main class="about-profile">
    <header class="about-intro">
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.intro }}</p>
    </header>

    <div class="about-copy">
      <p>
        {{ copy.namePrefix }}
        <em>{{ copy.sanskritWord }}</em>
        {{ copy.nameMid }}
        <a
          href="https://www.tuninst.net/SED-MW/download-prem/s.htm"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.dictionary }}
        </a>
        {{ copy.nameMeaning }}
      </p>
      <p>
        {{ copy.blogIntro }}
        <a
          href="https://dict.revised.moe.edu.tw/dictView.jsp?ID=159386&amp;la=0&amp;powerMode=0"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.chineseDictionary }}
        </a>
        {{ copy.chineseMeaning }}
        <a
          href="https://www.ahdictionary.com/word/search.html?q=boundless"
          target="_blank"
          rel="noopener noreferrer">
          {{ copy.englishDictionary }}
        </a>
        {{ copy.englishMeaning }}
      </p>
      <p>{{ copy.writing }}</p>
      <p>
        {{ copy.closingPrefix }}
        <a :href="copy.albumsUrl">{{ copy.albumsText }}</a>
        {{ copy.closingSuffix }}
      </p>
    </div>

    <nav class="contact-links" :aria-label="copy.contact">
      <a href="mailto:hi@sanjeev.top" :aria-label="copy.email">
        hi@sanjeev.top
      </a>
      <a
        href="https://github.com/Sanjeever"
        target="_blank"
        rel="noopener noreferrer">
        GitHub
      </a>
    </nav>
  </main>
</template>

<style scoped>
.about-profile {
  width: min(760px, 100%);
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 80px) 32px 120px;
}

.about-intro h1 {
  margin: 0 0 40px;
  color: var(--vp-c-text-1);
  font-size: clamp(40px, 6vw, 56px);
  font-weight: 640;
  letter-spacing: -0.04em;
  line-height: 1.2;
}

.about-intro p,
.about-copy p {
  margin: 0 0 28px;
  color: var(--vp-c-text-1);
  font-size: 17px;
  line-height: 1.9;
}

.about-profile a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.about-profile a:hover {
  color: var(--vp-c-brand-2);
}

.about-profile a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 48px;
  font-size: 15px;
  line-height: 1.75;
}

@media (max-width: 767px) {
  .about-profile {
    padding: calc(var(--vp-nav-height) + 48px) 24px 80px;
  }

  .about-intro h1 {
    margin-bottom: 32px;
  }
}
</style>
