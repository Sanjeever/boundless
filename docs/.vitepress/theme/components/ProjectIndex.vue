<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const screenshotState = ref<'loading' | 'loaded' | 'error'>('loading')

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'Projects',
        description: 'Open-source projects I create and maintain.',
        github: 'View on GitHub',
        screenshot: 'Port Sentinel application screenshot',
        screenshotLoading: 'Loading project screenshot',
        screenshotError: 'Project screenshot unavailable',
        projects: [
          {
            name: 'port_sentinel',
            description:
              'A Flutter Windows desktop application for monitoring ports and managing processes.',
            stack: ['Flutter', 'Windows', 'Dart'],
            url: 'https://github.com/Sanjeever/port_sentinel',
          },
          {
            name: 'opengauss-mcp',
            description:
              'An openGauss database tooling service built with Spring AI MCP Server. MCP clients connect over stdio to inspect schemas, query statistics, and execute SQL.',
            stack: ['Java', 'Spring AI', 'MCP'],
            url: 'https://github.com/Sanjeever/opengauss-mcp',
          },
          {
            name: 'ndx-dca-signal',
            description:
              "A local macOS application that generates dollar-cost averaging signals for Nasdaq-100 and QQQ-equivalent QDII ETFs traded on China's A-share market.",
            stack: ['macOS', 'Local-first', 'Investment'],
            url: 'https://github.com/Sanjeever/ndx-dca-signal',
          },
        ],
      }
    : {
        title: '项目',
        description: '我创建和维护的一些开源项目。',
        github: '在 GitHub 查看',
        screenshot: 'Port Sentinel 应用截图',
        screenshotLoading: '正在加载项目截图',
        screenshotError: '项目截图暂不可用',
        projects: [
          {
            name: 'port_sentinel',
            description:
              '一款用于监控端口和管理进程的 Flutter Windows 桌面应用。',
            stack: ['Flutter', 'Windows', 'Dart'],
            url: 'https://github.com/Sanjeever/port_sentinel',
          },
          {
            name: 'opengauss-mcp',
            description:
              '基于 Spring AI MCP Server 的 openGauss 数据库工具服务，支持 MCP 客户端通过 stdio 连接，并调用数据库工具查看表结构、查询统计信息和执行 SQL。',
            stack: ['Java', 'Spring AI', 'MCP'],
            url: 'https://github.com/Sanjeever/opengauss-mcp',
          },
          {
            name: 'ndx-dca-signal',
            description:
              '一款运行在本地 macOS 上的定投信号程序，面向 A 股市场中的纳斯达克 100、QQQ 等价 QDII-ETF。',
            stack: ['macOS', '本地优先', '投资'],
            url: 'https://github.com/Sanjeever/ndx-dca-signal',
          },
        ],
      }
)
</script>

<template>
  <main class="project-index">
    <header class="project-header">
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.description }}</p>
    </header>

    <section class="project-grid" :aria-label="copy.title">
      <article class="project project-featured">
        <div class="project-visual">
          <p v-if="screenshotState !== 'loaded'" aria-live="polite">
            {{
              screenshotState === 'error'
                ? copy.screenshotError
                : copy.screenshotLoading
            }}
          </p>
          <img
            v-if="screenshotState !== 'error'"
            src="https://raw.githubusercontent.com/Sanjeever/port_sentinel/main/assets/screenshot/home_page.png"
            :alt="copy.screenshot"
            width="1684"
            height="992"
            decoding="async"
            fetchpriority="high"
            @load="screenshotState = 'loaded'"
            @error="screenshotState = 'error'" />
        </div>
        <div class="project-copy">
          <p class="project-owner">Sanjeever</p>
          <h2>{{ copy.projects[0].name }}</h2>
          <p class="project-description">{{ copy.projects[0].description }}</p>
          <div class="project-footer">
            <ul :aria-label="isEnglish ? 'Technology' : '技术'">
              <li v-for="item in copy.projects[0].stack" :key="item">
                {{ item }}
              </li>
            </ul>
            <a
              :href="copy.projects[0].url"
              target="_blank"
              rel="noopener noreferrer">
              {{ copy.github }}
            </a>
          </div>
        </div>
      </article>

      <div class="secondary-projects">
        <article
          v-for="(project, index) in copy.projects.slice(1)"
          :key="project.name"
          class="project project-secondary"
          :class="`project-secondary-${index + 1}`">
          <img
            v-if="index === 1"
            class="project-mark"
            src="/logo.png"
            alt=""
            width="400"
            height="400" />
          <div class="project-copy">
            <p class="project-owner">Sanjeever</p>
            <h2>{{ project.name }}</h2>
            <p class="project-description">{{ project.description }}</p>
            <div class="project-footer">
              <ul :aria-label="isEnglish ? 'Technology' : '技术'">
                <li v-for="item in project.stack" :key="item">{{ item }}</li>
              </ul>
              <a :href="project.url" target="_blank" rel="noopener noreferrer">
                {{ copy.github }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.project-index {
  width: min(1180px, 100%);
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(var(--vp-nav-height) + 80px) clamp(24px, 4vw, 48px) 120px;
}

.project-header {
  max-width: 720px;
  margin-bottom: 72px;
}

.project-header h1 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(52px, 7vw, 82px);
  font-weight: 640;
  letter-spacing: -0.055em;
  line-height: 1;
}

.project-header p {
  margin: 24px 0 0;
  color: var(--vp-c-text-2);
  font-size: 17px;
  line-height: 1.7;
}

.project-grid {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(330px, 5fr);
  gap: 18px;
}

.project {
  position: relative;
  overflow: hidden;
  border-radius: var(--boundless-radius);
}

.project-featured {
  display: grid;
  min-height: 720px;
  background: var(--vp-c-bg-soft);
}

.project-visual {
  position: relative;
  display: block;
  min-height: 360px;
  overflow: hidden;
  background: var(--boundless-surface-strong);
}

.project-visual > p {
  position: absolute;
  inset: 0;
  display: grid;
  margin: 0;
  place-items: center;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.project-visual img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  object-position: center top;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.project-visual:hover img {
  transform: scale(1.015);
}

.project-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(28px, 4vw, 46px);
}

.project-owner {
  margin: 0 0 14px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.project h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 620;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.project-description {
  max-width: 54ch;
  margin: 20px 0 36px;
  color: var(--vp-c-text-2);
  font-size: 15px;
  line-height: 1.72;
}

.project-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-top: auto;
}

.project-footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  list-style: none;
}

.project-footer a {
  flex: none;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
}

.secondary-projects {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.project-secondary {
  min-height: 351px;
}

.project-secondary .project-copy {
  height: 100%;
}

.project-secondary h2 {
  font-size: clamp(24px, 2.6vw, 32px);
}

.project-secondary-1 {
  background: var(--boundless-accent-soft);
}

.project-secondary-2 {
  background: var(--boundless-surface-strong);
}

.project-mark {
  position: absolute;
  right: -52px;
  bottom: -62px;
  width: 210px;
  height: auto;
  opacity: 0.2;
  transform: rotate(12deg);
}

@media (prefers-reduced-motion: no-preference) {
  .project-header,
  .project-grid {
    animation: project-reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .project-grid {
    animation-delay: 80ms;
  }
}

@keyframes project-reveal {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 899px) {
  .project-grid {
    grid-template-columns: 1fr;
  }

  .project-featured {
    min-height: 0;
  }

  .secondary-projects {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }
}

@media (max-width: 767px) {
  .project-index {
    padding: calc(var(--vp-nav-height) + 52px) 18px 80px;
  }

  .project-header {
    margin-bottom: 52px;
  }

  .project-header h1 {
    font-size: 52px;
  }

  .project-visual,
  .project-visual img {
    min-height: 240px;
  }

  .secondary-projects {
    grid-template-columns: 1fr;
  }

  .project-secondary {
    min-height: 330px;
  }

  .project-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
