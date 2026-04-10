import { DialogPlugin } from 'tdesign-vue-next'

type DeployVersionPayload = {
  version?: string
}

const DEFAULT_POLL_INTERVAL = 60_000

let pollTimer: number | null = null
let hasNotifiedForUpdate = false

function normalizeBase(base: string): string {
  if (!base) return '/'
  return base.endsWith('/') ? base : `${base}/`
}

async function fetchDeployVersion(versionUrl: string): Promise<string | null> {
  const requestUrl = `${versionUrl}?t=${Date.now()}`
  const response = await fetch(requestUrl, { cache: 'no-store' })
  if (!response.ok) return null

  const payload = (await response.json()) as DeployVersionPayload
  if (!payload.version) return null
  return payload.version
}

function showReloadConfirm(): void {
  const isEnglish = window.location.pathname.startsWith('/en')
  const header = isEnglish ? 'Update Available' : '发现新版本'
  const body = isEnglish
    ? 'A new version has been deployed. Refresh this page now?'
    : '检测到网站有新版本，是否立即刷新页面？'
  const confirmText = isEnglish ? 'Refresh' : '立即刷新'
  const cancelText = isEnglish ? 'Later' : '稍后再说'

  DialogPlugin.confirm({
    header,
    body,
    confirmBtn: confirmText,
    cancelBtn: cancelText,
    onConfirm: () => {
      window.location.reload()
    },
  })
}

export function startDeployUpdateNotifier(base = '/'): void {
  if (typeof window === 'undefined') return
  if (pollTimer !== null) return

  const versionUrl = `${normalizeBase(base)}version.json`
  let currentVersion: string | null = null

  const checkForUpdate = async (): Promise<void> => {
    try {
      const latestVersion = await fetchDeployVersion(versionUrl)
      if (!latestVersion) return

      if (currentVersion === null) {
        currentVersion = latestVersion
        return
      }

      if (latestVersion !== currentVersion && !hasNotifiedForUpdate) {
        hasNotifiedForUpdate = true
        showReloadConfirm()
      }
    } catch {
      // Keep silent: network/CDN temporary failures should not affect reading.
    }
  }

  void checkForUpdate()
  pollTimer = window.setInterval(() => {
    void checkForUpdate()
  }, DEFAULT_POLL_INTERVAL)
}
