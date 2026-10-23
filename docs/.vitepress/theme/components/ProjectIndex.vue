<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

interface Project {
  id: string
  name: string
  repositoryName?: string
  description: string
  stack: string[]
  url: string
  screenshot?: {
    src: string
    alt: string
    width: number
    height: number
  }
}

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const screenshotStates = ref<Record<string, 'loaded' | 'error'>>({})

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'Projects',
        technology: 'Platform and technology',
        screenshotLoading: 'Loading project screenshot',
        screenshotError: 'Could not load screenshot',
        connectionDiagram:
          'An MCP client connects through SSH MCP to multiple SSH servers.',
        client: 'MCP client',
        server: 'Server',
      }
    : {
        title: '项目',
        technology: '平台与技术',
        screenshotLoading: '正在加载项目截图',
        screenshotError: '项目截图加载失败',
        connectionDiagram: 'MCP 客户端通过 SSH MCP 连接多台 SSH 服务器。',
        client: 'MCP 客户端',
        server: '服务器',
      }
)

const projects = computed<Project[]>(() => [
  {
    id: 'ssh-mcp',
    name: 'SSH MCP',
    description: isEnglish.value
      ? 'Connect to multiple SSH servers through MCP to run commands and transfer files.'
      : '通过 MCP 连接多台 SSH 服务器，执行命令并传输文件。',
    stack: ['MCP', 'SSH', 'TypeScript'],
    url: 'https://github.com/Sanjeever/ssh-mcp',
  },
  {
    id: 'port-sentinel',
    name: 'Port Sentinel',
    description: isEnglish.value
      ? 'Inspect local connections, find port conflicts, and manage processes across desktop platforms.'
      : '跨平台端口与进程管理工具，查看本地连接，定位并处理端口冲突。',
    stack: ['Windows / macOS / Linux', 'Go', 'Wails', 'React'],
    url: 'https://github.com/Sanjeever/port_sentinel',
    screenshot: {
      src: 'https://raw.githubusercontent.com/Sanjeever/port_sentinel/main/assets/screenshot/main-macos.png',
      alt: isEnglish.value
        ? 'Port Sentinel 2.0 on macOS with port search, connection filters, and a process table in Simplified Chinese'
        : 'Port Sentinel 2.0 macOS 中文界面，展示端口搜索、连接筛选与进程表格',
      width: 2360,
      height: 1520,
    },
  },
  {
    id: 'codex-deck',
    name: 'Codex Deck',
    description: isEnglish.value
      ? 'Manage Codex CLI accounts and quotas, and browse local sessions.'
      : '管理 Codex CLI 多账号与额度，浏览本地会话。',
    stack: [isEnglish.value ? 'Desktop' : '桌面应用', 'Wails', 'React'],
    url: 'https://github.com/Sanjeever/codex-deck',
    screenshot: {
      src: 'https://raw.githubusercontent.com/Sanjeever/codex-deck/main/docs/screenshots/accounts.png',
      alt: isEnglish.value
        ? 'Codex Deck account list with 5-hour and weekly quotas'
        : 'Codex Deck 账号列表与 5 小时、每周剩余额度',
      width: 2464,
      height: 1728,
    },
  },
  {
    id: 'model-confluence',
    name: isEnglish.value ? 'Model Confluence' : '模汇',
    repositoryName: 'model-confluence',
    description: isEnglish.value
      ? 'Give AI clients one endpoint for protocol conversion and usage records.'
      : '为 AI 客户端提供统一入口，转换协议并记录调用用量。',
    stack: [isEnglish.value ? 'Self-hosted' : '自部署', 'Go', 'React'],
    url: 'https://github.com/Sanjeever/model-confluence',
    screenshot: {
      src: 'https://raw.githubusercontent.com/Sanjeever/model-confluence/main/docs/screenshots/model-routes.png',
      alt: isEnglish.value
        ? 'Model Confluence model routing with ordered providers and supported protocols'
        : '模汇的模型路由页面，展示有序供应商与支持的协议',
      width: 1920,
      height: 913,
    },
  },
])
</script>

<template>
  <main class="project-index">
    <header class="project-header">
      <h1>{{ copy.title }}</h1>
    </header>

    <section class="project-grid" :aria-label="copy.title">
      <article
        v-for="project in projects"
        :key="project.id"
        class="project"
        :aria-labelledby="`project-${project.id}`">
        <div class="project-visual">
          <template v-if="project.screenshot">
            <p
              v-if="screenshotStates[project.id] !== 'loaded'"
              class="screenshot-status"
              role="status">
              {{
                screenshotStates[project.id] === 'error'
                  ? copy.screenshotError
                  : copy.screenshotLoading
              }}
            </p>
            <img
              v-if="screenshotStates[project.id] !== 'error'"
              :src="project.screenshot.src"
              :alt="project.screenshot.alt"
              :width="project.screenshot.width"
              :height="project.screenshot.height"
              :loading="project.id === 'port-sentinel' ? 'eager' : 'lazy'"
              decoding="async"
              @load="screenshotStates[project.id] = 'loaded'"
              @error="screenshotStates[project.id] = 'error'" />
          </template>
          <svg
            v-else
            class="connection-diagram"
            viewBox="0 0 540 310"
            role="img"
            :aria-label="copy.connectionDiagram">
            <g class="connection-lines" fill="none" stroke-width="1.5">
              <path d="M148 155H222M338 155H374M374 71V239" />
              <path d="M374 71H410M374 155H410M374 239H410" />
            </g>
            <g class="connection-node">
              <rect x="26" y="125" width="122" height="60" rx="6" />
              <rect x="410" y="48" width="104" height="46" rx="6" />
              <rect x="410" y="132" width="104" height="46" rx="6" />
              <rect x="410" y="216" width="104" height="46" rx="6" />
            </g>
            <rect
              class="connection-hub"
              x="222"
              y="125"
              width="116"
              height="60"
              rx="6" />
            <g class="connection-label" text-anchor="middle">
              <text x="87" y="160">{{ copy.client }}</text>
              <text class="connection-hub-label" x="280" y="160">SSH MCP</text>
              <text x="462" y="76">{{ copy.server }} 01</text>
              <text x="462" y="160">{{ copy.server }} 02</text>
              <text x="462" y="244">{{ copy.server }} 03</text>
            </g>
          </svg>
        </div>

        <div class="project-copy">
          <h2 :id="`project-${project.id}`">
            <a :href="project.url" target="_blank" rel="noopener noreferrer">
              {{ project.name }}
            </a>
          </h2>
          <p v-if="project.repositoryName" class="project-repository">
            {{ project.repositoryName }}
          </p>
          <p class="project-description">{{ project.description }}</p>
          <div class="project-footer">
            <ul :aria-label="copy.technology">
              <li v-for="item in project.stack" :key="item">{{ item }}</li>
            </ul>
            <a
              :href="project.url"
              :aria-label="`${project.name} — GitHub`"
              target="_blank"
              rel="noopener noreferrer">
              GitHub
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.project-index {
  width: min(1180px, 100%);
  margin-inline: auto;
  padding: 48px clamp(24px, 4vw, 48px) 100px;
}

.project-header {
  margin-bottom: 40px;
}

.project-header h1 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(38px, 5vw, 52px);
  font-weight: 640;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 56px 32px;
}

.project {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.project-visual {
  position: relative;
  display: grid;
  aspect-ratio: 8 / 5;
  overflow: hidden;
  place-items: center;
  border-radius: var(--boundless-radius);
  background: var(--vp-c-bg-soft);
}

.screenshot-status {
  position: absolute;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.project-visual img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: clamp(12px, 2vw, 20px);
  object-fit: contain;
}

.connection-diagram {
  width: 100%;
  height: 100%;
}

.connection-lines {
  stroke: var(--vp-c-text-3);
}

.connection-node {
  fill: var(--vp-c-bg);
}

.connection-hub {
  fill: var(--boundless-accent-soft);
}

.connection-label {
  fill: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.connection-hub-label {
  fill: var(--vp-c-brand-1);
  font-weight: 600;
}

.project-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-top: 24px;
}

.project h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(24px, 2.5vw, 30px);
  font-weight: 620;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.project h2 a {
  color: inherit;
  text-decoration: none;
}

.project-repository {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.project-description {
  max-width: 54ch;
  margin: 14px 0 24px;
  color: var(--vp-c-text-2);
  font-size: 15px;
  line-height: 1.72;
  text-wrap: pretty;
}

.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
}

.project-footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  list-style: none;
}

.project-footer a {
  flex: none;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.project a:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.project a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
  border-radius: 2px;
}

@media (max-width: 767px) {
  .project-index {
    padding: 32px 20px 72px;
  }

  .project-header {
    margin-bottom: 32px;
  }

  .project-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .project-copy {
    padding-top: 20px;
  }
}
</style>
