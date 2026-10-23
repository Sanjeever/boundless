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
        nameIntro: 'Sanjeev corresponds to the Sanskrit word saṃjīva. The ',
        dictionary: 'Monier-Williams Sanskrit-English Dictionary',
        nameMeaning:
          ' lists “living,” “making alive,” and “revival” among its meanings. I like the sense of vitality. I hope to always have something to work on and something to look forward to.',
        outlook:
          'I like Wang Xiaobo’s passion for wisdom, and I share the resolve not to surrender to nihilism. When I want to understand something, I read and ask. When I want to make something, I get to work.',
        blogIntro: 'This blog is called 无垠 (Boundless). The ',
        chineseDictionary: 'Revised Mandarin Chinese Dictionary',
        chineseMeaning:
          ' defines 無垠 as “遼遠而無邊際,” meaning vast and without boundaries. The ',
        englishDictionary: 'American Heritage Dictionary',
        englishMeaning:
          ' defines boundless as “Being without boundaries or limits; unlimited.”',
        writing:
          'I want to leave room for my curiosity. I write code, and I’m interested in things beyond it too. I can take my time learning what I don’t yet understand, and write down questions I haven’t worked out. Understanding a concept, building something, or revising a belief I once felt sure of all help me see a little further. If my interests change, there will still be room for them here.',
        contact: 'Contact',
        email: 'Email',
      }
    : {
        title: '关于我',
        intro: '我是 Sanjeev，现居南宁，平时写代码。',
        nameIntro: 'Sanjeev 对应梵语 saṃjīva。',
        dictionary: '《Monier-Williams 梵英词典》',
        nameMeaning:
          '收有“活着”“赋予生命”“复苏”等释义。我喜欢“生机”这层寓意，希望自己始终有事可做，有所向往。',
        outlook:
          '我喜欢王小波对智慧那份热忱，也认同不向虚无投降的态度。想弄明白，就去读、去问；想做出来，就动手。',
        blogIntro: '这里叫「无垠 Boundless」。',
        chineseDictionary: '《重編國語辭典修訂本》',
        chineseMeaning: '将“無垠”解释为“遼遠而無邊際”；',
        englishDictionary: '《美国传统英语词典》',
        englishMeaning:
          '对 boundless 的释义是“Being without boundaries or limits; unlimited”，即没有边界或限制。',
        writing:
          '我想给自己的好奇心留些余地，写代码，也关心代码之外的事。现在还不懂的，可以慢慢去学；还没想清楚的，也可以先写下来。读懂一个概念、做出一个东西，或是修正一个原先确信的判断，都让自己的理解往外走一点。以后兴趣变了，这里仍然有地方可写。',
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
        {{ copy.nameIntro }}
        <a href="https://www.tuninst.net/SED-MW/download-prem/s.htm">
          {{ copy.dictionary }}
        </a>
        {{ copy.nameMeaning }}
      </p>
      <p>{{ copy.outlook }}</p>
      <p>
        {{ copy.blogIntro }}
        <a
          href="https://dict.revised.moe.edu.tw/dictView.jsp?ID=159386&amp;la=0&amp;powerMode=0">
          {{ copy.chineseDictionary }}
        </a>
        {{ copy.chineseMeaning }}
        <a href="https://www.ahdictionary.com/word/search.html?q=boundless">
          {{ copy.englishDictionary }}
        </a>
        {{ copy.englishMeaning }}
      </p>
      <p>{{ copy.writing }}</p>
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
