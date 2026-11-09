<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

interface Project {
  id: string
  name: string
  description: string
  detail: string
  platform: string
  stack: string[]
  url: string
  links: { label: string; url: string }[]
  screenshot: {
    src: string
    alt: string
    width: number
    height: number
  }
}

const { lang } = useData()
const isEnglish = computed(() => lang.value.startsWith('en'))
const localePrefix = computed(() => (isEnglish.value ? '/en' : ''))
const screenshotStates = ref<Record<string, 'loaded' | 'error'>>({})

const copy = computed(() =>
  isEnglish.value
    ? {
        title: 'Projects',
        otherTools: 'Other tools',
        technology: 'Built with',
        download: 'Download',
        source: 'Source',
        story: 'Development notes',
        guide: 'Deployment guide',
        viewScreenshot: 'View full screenshot',
        screenshotLoading: 'Loading project screenshot',
        screenshotError: 'Could not load screenshot',
      }
    : {
        title: '项目',
        otherTools: '其他工具',
        technology: '开发技术',
        download: '下载',
        source: '源码',
        story: '开发记录',
        guide: '部署文档',
        viewScreenshot: '查看完整截图',
        screenshotLoading: '正在加载项目截图',
        screenshotError: '项目截图加载失败',
      }
)

const projects = computed<Project[]>(() => [
  {
    id: 'termquay',
    name: 'TermQuay',
    description: isEnglish.value
      ? 'SSH, local terminals, remote file editing, and Linux monitoring in one desktop workspace.'
      : '把 SSH、本地终端、远端文件编辑和 Linux 监控放进同一个桌面工作区。',
    detail: isEnglish.value
      ? 'Terminals, files, and monitoring sit side by side to keep troubleshooting in context. Embedded RDP and encrypted backups round out the workspace.'
      : '终端、文件与监控并排放置，减少排障时来回切换窗口。也支持内嵌 RDP 与加密备份。',
    platform: 'Windows · macOS · Linux',
    stack: ['Go', 'Wails', 'React'],
    url: 'https://github.com/Sanjeever/termquay',
    links: [
      {
        label: copy.value.download,
        url: 'https://github.com/Sanjeever/termquay/releases',
      },
      {
        label: copy.value.source,
        url: 'https://github.com/Sanjeever/termquay',
      },
    ],
    screenshot: {
      src: '/images/projects/termquay.png',
      alt: isEnglish.value
        ? 'TermQuay SSH workspace with a remote file tree, terminal, and Linux resource monitoring side by side'
        : 'TermQuay SSH 工作区，并排展示远端文件树、终端与 Linux 资源监控',
      width: 1279,
      height: 819,
    },
  },
  {
    id: 'port-sentinel',
    name: 'Port Sentinel',
    description: isEnglish.value
      ? 'Inspect local connections, find port conflicts, and manage the processes behind them.'
      : '查看本地连接，定位端口占用，并处理关联进程。',
    detail: isEnglish.value
      ? 'Rebuilt from Flutter with Go and Wails for three desktop platforms, with careful handling of permissions and process termination.'
      : '从 Flutter 重写到 Go 与 Wails，扩展到三个桌面平台，重新梳理权限申请和进程退出行为。',
    platform: 'Windows · macOS · Linux',
    stack: ['Go', 'Wails', 'React'],
    url: 'https://github.com/Sanjeever/port_sentinel',
    links: [
      {
        label: copy.value.download,
        url: 'https://github.com/Sanjeever/port_sentinel/releases',
      },
      {
        label: copy.value.source,
        url: 'https://github.com/Sanjeever/port_sentinel',
      },
      {
        label: copy.value.story,
        url: `${localePrefix.value}/posts/2026/10/23-port-sentinel-2`,
      },
    ],
    screenshot: {
      src: '/images/projects/port-sentinel.png',
      alt: isEnglish.value
        ? 'Port Sentinel 2.0 on macOS with port search, connection filters, and a process table in Simplified Chinese'
        : 'Port Sentinel 2.0 macOS 中文界面，展示端口搜索、连接筛选与进程表格',
      width: 2360,
      height: 1520,
    },
  },
  {
    id: 'model-confluence',
    name: isEnglish.value ? 'Model Confluence' : '模汇',
    description: isEnglish.value
      ? 'A personal AI gateway that translates between Chat Completions, Responses, and Messages.'
      : '个人自部署 AI 网关，转换 Chat Completions、Responses 与 Messages 三种协议。',
    detail: isEnglish.value
      ? 'Keeps each upstream attempt and its payloads, usage, and latency so failed requests can be traced back to the step that went wrong.'
      : '保留每次上游尝试的报文、用量与耗时，让失败请求可以追溯到具体环节。',
    platform: isEnglish.value ? 'Self-hosted' : '个人自部署',
    stack: ['Go', 'React', 'SQLite'],
    url: 'https://github.com/Sanjeever/model-confluence',
    links: [
      {
        label: copy.value.download,
        url: 'https://github.com/Sanjeever/model-confluence/releases',
      },
      {
        label: copy.value.source,
        url: 'https://github.com/Sanjeever/model-confluence',
      },
      {
        label: copy.value.story,
        url: `${localePrefix.value}/posts/2026/08/12-model-confluence`,
      },
    ],
    screenshot: {
      src: '/images/projects/model-confluence.png',
      alt: isEnglish.value
        ? 'Model Confluence request details showing a failed upstream attempt and its diagnostic information'
        : '模汇请求详情，展示失败请求的上游尝试与排障信息',
      width: 1440,
      height: 900,
    },
  },
  {
    id: 'tunnelquay',
    name: 'TunnelQuay',
    description: isEnglish.value
      ? 'Self-hosted TCP and UDP tunnels, with devices and port mappings managed from a web panel.'
      : '个人自托管 TCP、UDP 内网穿透工具，通过 Web 面板管理设备与端口映射。',
    detail: isEnglish.value
      ? 'Tunnel configuration stays on the server. Change mappings from the panel without signing in to each client device.'
      : '隧道配置保存在服务端，调整映射时无需逐台登录客户端设备。',
    platform: isEnglish.value ? 'Self-hosted' : '个人自部署',
    stack: ['Go', 'React', 'SQLite'],
    url: 'https://github.com/Sanjeever/tunnelquay',
    links: [
      {
        label: copy.value.source,
        url: 'https://github.com/Sanjeever/tunnelquay',
      },
      {
        label: copy.value.guide,
        url: 'https://github.com/Sanjeever/tunnelquay/blob/main/docs/development.md',
      },
    ],
    screenshot: {
      src: '/images/projects/tunnelquay.png',
      alt: isEnglish.value
        ? 'TunnelQuay device panel showing an online device, its platform, version, and round-trip latency'
        : 'TunnelQuay 设备面板，展示在线设备、平台、版本与往返延迟',
      width: 1280,
      height: 800,
    },
  },
  {
    id: 'codex-deck',
    name: 'Codex Deck',
    description: isEnglish.value
      ? 'Manage Codex CLI accounts and quotas, and browse local sessions in a desktop app.'
      : '管理 Codex CLI 多账号与套餐额度，在桌面应用中浏览本地会话。',
    detail: isEnglish.value
      ? 'See five-hour and weekly quotas together, switch CLI accounts, and read local conversations without modifying session files.'
      : '集中查看 5 小时与每周额度，切换 CLI 账号；以只读方式浏览本地对话记录。',
    platform: 'Windows · macOS · Linux',
    stack: ['Go', 'Wails', 'React'],
    url: 'https://github.com/Sanjeever/codex-deck',
    links: [
      {
        label: copy.value.download,
        url: 'https://github.com/Sanjeever/codex-deck/releases',
      },
      {
        label: copy.value.source,
        url: 'https://github.com/Sanjeever/codex-deck',
      },
    ],
    screenshot: {
      src: '/images/projects/codex-deck.png',
      alt: isEnglish.value
        ? 'Codex Deck account list with five-hour and weekly quotas'
        : 'Codex Deck 账号列表与 5 小时、每周剩余额度',
      width: 2464,
      height: 1728,
    },
  },
])

const otherTools = computed(() => [
  {
    name: 'SSH MCP',
    description: isEnglish.value
      ? 'Connect AI clients to SSH servers to run commands and transfer files.'
      : '让 AI 客户端通过 MCP 连接 SSH 服务器，执行命令与传输文件。',
    url: 'https://github.com/Sanjeever/ssh-mcp',
  },
  {
    name: 'openGauss MCP',
    description: isEnglish.value
      ? 'Inspect openGauss schemas, query statistics, and run SQL through MCP.'
      : '通过 MCP 查看 openGauss 表结构、查询统计信息与执行 SQL。',
    url: 'https://github.com/Sanjeever/opengauss-mcp',
  },
  {
    name: 'g3m-battery',
    description: isEnglish.value
      ? 'A Windows tray app that reads the G3M Pro mouse battery directly over HID.'
      : '直连 HID 接口，在 Windows 托盘查看漫步者 G3M Pro 鼠标电量。',
    url: 'https://github.com/Sanjeever/g3m-battery',
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
        :class="{ 'project-featured': project.id === 'termquay' }"
        :aria-labelledby="`project-${project.id}`">
        <a
          class="project-visual"
          :href="project.screenshot.src"
          :aria-label="`${project.name} · ${copy.viewScreenshot}`"
          target="_blank"
          rel="noopener noreferrer">
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
            :loading="project.id === 'termquay' ? 'eager' : 'lazy'"
            decoding="async"
            @load="screenshotStates[project.id] = 'loaded'"
            @error="screenshotStates[project.id] = 'error'" />
        </a>

        <div class="project-copy">
          <h2 :id="`project-${project.id}`">
            <a :href="project.url" target="_blank" rel="noopener noreferrer">
              {{ project.name }}
            </a>
          </h2>
          <p class="project-description">{{ project.description }}</p>
          <p class="project-detail">{{ project.detail }}</p>
          <div class="project-footer">
            <p class="project-platform">{{ project.platform }}</p>
            <ul :aria-label="copy.technology">
              <li v-for="item in project.stack" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="project-links">
            <a
              v-for="link in project.links"
              :key="link.url"
              :href="link.url"
              :aria-label="`${project.name} · ${link.label}`"
              :target="link.url.startsWith('https://') ? '_blank' : undefined"
              :rel="
                link.url.startsWith('https://')
                  ? 'noopener noreferrer'
                  : undefined
              ">
              {{ link.label }}
              <span aria-hidden="true">
                {{ link.url.startsWith('https://') ? '↗' : '→' }}
              </span>
            </a>
          </div>
        </div>
      </article>
    </section>

    <section class="other-tools" aria-labelledby="other-tools-title">
      <h2 id="other-tools-title">{{ copy.otherTools }}</h2>
      <ul>
        <li v-for="tool in otherTools" :key="tool.url">
          <a :href="tool.url" target="_blank" rel="noopener noreferrer">
            <span class="tool-name">{{ tool.name }}</span>
            <span class="tool-description">{{ tool.description }}</span>
            <span class="tool-arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>
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
  gap: 64px 40px;
}

.project {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.project-featured {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  align-items: center;
  gap: 40px;
  margin-bottom: 8px;
}

.project-featured .project-copy {
  padding-top: 0;
}

.project-featured h2 {
  font-size: clamp(30px, 3vw, 38px);
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
  padding: 12px;
  object-fit: contain;
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

.project-description {
  max-width: 54ch;
  margin: 14px 0 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
  line-height: 1.72;
  text-wrap: pretty;
}

.project-detail {
  max-width: 54ch;
  margin: 8px 0 24px;
  color: var(--vp-c-text-3);
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.project-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-top: auto;
}

.project-platform {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.6;
}

.project-footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0;
  padding: 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  list-style: none;
}

.project-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 20px;
}

.project-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.project h2 a:hover,
.project-links a:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.project-index a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
  border-radius: 2px;
}

.other-tools {
  margin-top: 88px;
}

.other-tools h2 {
  margin: 0 0 24px;
  color: var(--vp-c-text-1);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.other-tools ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.other-tools a {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 16px;
  align-items: baseline;
  gap: 24px;
  padding: 12px 0;
  text-decoration: none;
}

.tool-name {
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 550;
}

.tool-description {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

.tool-arrow {
  color: var(--vp-c-text-3);
}

.other-tools a:hover .tool-name,
.other-tools a:hover .tool-arrow {
  color: var(--vp-c-brand-2);
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

  .project-featured {
    display: flex;
    gap: 0;
    margin-bottom: 8px;
  }

  .project-copy,
  .project-featured .project-copy {
    padding-top: 20px;
  }

  .other-tools {
    margin-top: 64px;
  }

  .other-tools a {
    grid-template-columns: minmax(0, 1fr) 16px;
    gap: 6px 16px;
  }

  .tool-description {
    grid-column: 1;
    grid-row: 2;
  }

  .tool-arrow {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
