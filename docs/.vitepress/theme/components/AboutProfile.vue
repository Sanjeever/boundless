<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'About Me',
        intro: 'Currently residing in Nanning, with the pen name Sanjeev.',
        description:
          'This is my personal blog for documenting learning and life.',
        technology: 'Technology',
        backend: 'Backend',
        frontend: 'Frontend',
        contact: 'Contact',
        email: 'Email',
        interests: 'Interests',
        music: 'Music',
        musicians: 'Cheer Chen, Dean Ting, Chen Li, Li Zhi',
        literature: 'Literature',
        writers: 'Wang Xiaobo',
        albumAlt: [
          'JESUS IS KING album cover',
          '背面是我 album cover',
          '吉他手 album cover',
        ],
      }
    : {
        title: '关于我',
        intro: '现居南宁，笔名 Sanjeev。',
        description: '这是我的个人博客，用于记录学习与生活。',
        technology: '技术栈',
        backend: '后端',
        frontend: '前端',
        contact: '联系我',
        email: '邮箱',
        interests: '爱好',
        music: '音乐',
        musicians: '陈绮贞、丁世光、陈粒、李志',
        literature: '文学',
        writers: '王小波',
        albumAlt: [
          'JESUS IS KING 专辑封面',
          '背面是我专辑封面',
          '吉他手专辑封面',
        ],
      }
)

const backend = [
  'Java, Spring Boot',
  'MySQL, ClickHouse, TrinoSQL',
  'Redis, Kafka',
  'JUnit 5, Maven',
  'MyBatis Plus',
]
const frontend = ['Vue 3, TypeScript', 'Vite', 'Tailwind CSS']
</script>

<template>
  <main class="about-profile">
    <header class="about-intro">
      <div>
        <h1>{{ copy.title }}</h1>
        <p class="intro-lead">{{ copy.intro }}</p>
        <p>{{ copy.description }}</p>
      </div>
      <img
        src="/logo.png"
        :alt="isEnglish ? 'Boundless flower mark' : '无垠花瓣标志'"
        width="400"
        height="400" />
    </header>

    <section class="technology-section">
      <h2>{{ copy.technology }}</h2>
      <div class="technology-groups">
        <div>
          <h3>{{ copy.backend }}</h3>
          <ul>
            <li v-for="item in backend" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div>
          <h3>{{ copy.frontend }}</h3>
          <ul>
            <li v-for="item in frontend" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="contact-section">
      <h2>{{ copy.contact }}</h2>
      <div class="contact-links">
        <a href="mailto:me@sanjeev.top">
          <span>{{ copy.email }}</span>
          <strong>me@sanjeev.top</strong>
        </a>
        <a
          href="https://github.com/Sanjeever"
          target="_blank"
          rel="noopener noreferrer">
          <span>GitHub</span>
          <strong>github.com/Sanjeever</strong>
        </a>
      </div>
    </section>

    <section class="interests-section">
      <div class="interest-copy">
        <h2>{{ copy.interests }}</h2>
        <div>
          <h3>{{ copy.music }}</h3>
          <p>{{ copy.musicians }}</p>
        </div>
        <div>
          <h3>{{ copy.literature }}</h3>
          <p>{{ copy.writers }}</p>
        </div>
      </div>
      <div class="interest-covers">
        <img
          src="/images/albums/jesus-is-king.jpg"
          :alt="copy.albumAlt[0]"
          loading="lazy" />
        <img
          src="/images/albums/back-of-me.jpg"
          :alt="copy.albumAlt[1]"
          loading="lazy" />
        <img
          src="/images/albums/groupies.jpg"
          :alt="copy.albumAlt[2]"
          loading="lazy" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.about-profile {
  width: min(1100px, 100%);
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 80px) clamp(24px, 4vw, 48px) 120px;
}

.about-intro {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(220px, 4fr);
  gap: clamp(48px, 8vw, 112px);
  align-items: center;
  min-height: 420px;
  margin-bottom: 128px;
}

.about-intro h1 {
  margin: 0 0 38px;
  color: var(--vp-c-text-1);
  font-size: clamp(56px, 8vw, 88px);
  font-weight: 640;
  letter-spacing: -0.06em;
  line-height: 0.98;
}

.about-intro p {
  max-width: 42ch;
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
  font-size: 17px;
  line-height: 1.75;
}

.about-intro .intro-lead {
  color: var(--vp-c-text-1);
  font-size: 20px;
}

.about-intro img {
  width: min(280px, 100%);
  height: auto;
  transform: rotate(4deg);
}

section {
  margin-top: 120px;
}

section > h2,
.interest-copy > h2 {
  margin: 0 0 44px;
  color: var(--vp-c-text-1);
  font-size: clamp(34px, 4.2vw, 48px);
  font-weight: 620;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.technology-groups {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: clamp(48px, 10vw, 132px);
  max-width: 850px;
}

.technology-groups h3,
.interest-copy h3 {
  margin: 0 0 20px;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 520;
}

.technology-groups ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.55;
  list-style: none;
}

.contact-section {
  max-width: 850px;
}

.contact-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.contact-links a {
  display: grid;
  gap: 14px;
  min-height: 150px;
  align-content: space-between;
  padding: 26px;
  border-radius: var(--boundless-radius);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.contact-links a:hover,
.contact-links a:focus-visible {
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.contact-links span {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.contact-links strong {
  overflow-wrap: anywhere;
  font-size: 17px;
  font-weight: 580;
}

.interests-section {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.6fr);
  gap: clamp(56px, 9vw, 120px);
  align-items: end;
}

.interest-copy > div + div {
  margin-top: 34px;
}

.interest-copy p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 16px;
  line-height: 1.7;
}

.interest-covers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
}

.interest-covers img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--boundless-radius);
  object-fit: cover;
  box-shadow: var(--boundless-media-shadow);
}

.interest-covers img:first-child {
  transform: rotate(-4deg);
}

.interest-covers img:nth-child(2) {
  position: relative;
  z-index: 1;
  transform: scale(1.08) rotate(2deg);
}

.interest-covers img:last-child {
  transform: rotate(5deg);
}

@media (prefers-reduced-motion: no-preference) {
  .about-intro {
    animation: about-reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

@keyframes about-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 767px) {
  .about-profile {
    padding: calc(var(--vp-nav-height) + 52px) 18px 80px;
  }

  .about-intro {
    grid-template-columns: minmax(0, 1fr) 110px;
    gap: 24px;
    min-height: 0;
    margin-bottom: 0;
  }

  .about-intro h1 {
    margin-bottom: 28px;
    font-size: 52px;
  }

  .about-intro img {
    width: 110px;
  }

  section {
    margin-top: 80px;
  }

  section > h2,
  .interest-copy > h2 {
    margin-bottom: 34px;
    font-size: 36px;
  }

  .technology-groups,
  .contact-links,
  .interests-section {
    grid-template-columns: 1fr;
  }

  .technology-groups {
    gap: 44px;
  }

  .interests-section {
    gap: 52px;
  }
}

@media (max-width: 420px) {
  .about-intro {
    display: block;
  }

  .about-intro img {
    display: none;
  }
}
</style>
