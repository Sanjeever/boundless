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
          'I like Wang Xiaobo, especially his passion for wisdom and his refusal to surrender to nihilism. To me, that means continuing toward my goals. When I want to understand something, I read and ask. When I want to make something, I get to work.',
        writing:
          'I write here about technical work and everyday thoughts. Some questions have no answers yet. I write them down anyway.',
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
          '我喜欢王小波，尤其认同他对智慧那份热忱，以及不向虚无投降这句话。对我来说，就是朝着目标持续向前。想弄明白，就去读、去问；想做出来，就动手。',
        writing: '这里记录技术实践与日常思考。有些问题暂时没有答案，也先记下。',
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
