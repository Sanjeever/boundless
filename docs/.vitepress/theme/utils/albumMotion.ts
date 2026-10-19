export type CloudPositions = Map<HTMLElement, { left: number; top: number }>
type AlbumPositions = Map<
  HTMLElement,
  { left: number; top: number; visible: boolean }
>

export function createAlbumMotion(
  onPreferenceChange: (enabled: boolean) => void
) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const animations = new Map<HTMLElement, Animation>()

  function animate(
    element: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
    complete?: () => void
  ) {
    animations.get(element)?.cancel()
    if (preference.matches) {
      complete?.()
      return
    }

    const animation = element.animate(frames, { fill: 'both', ...options })
    animations.set(element, animation)
    animation.oncancel = () => {
      if (animations.get(element) === animation) animations.delete(element)
      complete?.()
    }
    animation.onfinish = () => {
      animation.oncancel = null
      if (animations.get(element) === animation) animations.delete(element)
      animation.cancel()
      complete?.()
    }
  }

  function updatePreference() {
    if (preference.matches) {
      for (const animation of animations.values()) animation.cancel()
    }
    onPreferenceChange(!preference.matches)
  }

  preference.addEventListener('change', updatePreference)
  updatePreference()

  function cloudElements(root: HTMLElement) {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        '.artist:not(.artist-leaving), .expand-artists, .filter-summary, .cover-grid'
      )
    )
  }

  function captureCloud(root: HTMLElement): CloudPositions {
    return new Map(
      cloudElements(root).map(element => {
        const rect = element.getBoundingClientRect()
        return [element, { left: rect.left, top: rect.top }]
      })
    )
  }

  function moveCloud(root: HTMLElement, before: CloudPositions) {
    const toggle = root.querySelector<HTMLElement>('.expand-artists')!
    animations.get(toggle)?.cancel()
    if (
      toggle.getAttribute('aria-expanded') === 'false' &&
      document.activeElement === toggle
    ) {
      const top = toggle.getBoundingClientRect().top
      const safeTop =
        parseFloat(getComputedStyle(root).getPropertyValue('--vp-nav-height')) +
        16
      if (top < safeTop) {
        window.scrollBy({ top: top - safeTop, behavior: 'instant' })
      }
    }

    for (const element of cloudElements(root)) {
      const old = before.get(element)
      if (!old) {
        const name = element.querySelector<HTMLElement>('.artist-name')!
        animate(name, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
        continue
      }

      animations.get(element)?.cancel()
      const rect = element.getBoundingClientRect()
      const dx = old.left - rect.left
      const dy = old.top - rect.top
      if (!dx && !dy) continue
      animate(
        element,
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
      )
    }
  }

  function captureAlbums(root: HTMLElement): AlbumPositions {
    return new Map(
      Array.from(root.querySelectorAll<HTMLElement>('.album')).map(album => {
        const rect = album.getBoundingClientRect()
        return [
          album,
          {
            left: rect.left,
            top: rect.top + window.scrollY,
            visible: rect.top < window.innerHeight && rect.bottom > 0,
          },
        ]
      })
    )
  }

  function moveAlbums(root: HTMLElement, before: AlbumPositions) {
    for (const album of root.querySelectorAll<HTMLElement>(
      '.album:not(.album-leave-active)'
    )) {
      const old = before.get(album)
      if (!old) continue
      animations.get(album)?.cancel()
      const rect = album.getBoundingClientRect()
      if (rect.top >= window.innerHeight || rect.bottom <= 0) continue
      const dx = old.left - rect.left
      const dy = old.top - rect.top - window.scrollY
      if (!dx && !dy) continue
      // 离屏唱片在新位置淡入，避免长距离穿越页面。
      animate(
        album,
        [
          old.visible
            ? { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 }
            : { transform: 'translateY(6px)', opacity: 0 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ],
        {
          duration: old.visible ? 300 : 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }
      )
    }
  }

  function reveal(root: HTMLElement) {
    const cloud = root.querySelector<HTMLElement>('.artist-cloud')!
    const narrow = window.matchMedia('(max-width: 559px)').matches
    for (const button of cloud.querySelectorAll<HTMLElement>('.artist')) {
      const distance = Math.hypot(
        (button.offsetLeft + button.offsetWidth / 2) / cloud.clientWidth - 0.5,
        (button.offsetTop + button.offsetHeight / 2) / cloud.clientHeight - 0.5
      )
      const delay = Math.min(2, Math.floor(distance * 6)) * (narrow ? 20 : 40)
      animate(
        button.querySelector<HTMLElement>('.artist-name')!,
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 360, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      )
    }

    const visible = Array.from(
      root.querySelectorAll<HTMLElement>('.album figure')
    ).filter(figure => {
      const rect = figure.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    })
    visible.forEach((figure, index) => {
      animate(
        figure,
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 420,
          delay: 100 + Math.min(index * (narrow ? 20 : 30), narrow ? 40 : 120),
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }
      )
    })
  }

  function leaveArtist(element: Element, done: () => void) {
    const button = element as HTMLElement
    button.classList.add('artist-leaving')
    button.inert = true
    animate(button, [{ opacity: 1 }, { opacity: 0 }], { duration: 120 }, done)
  }

  function stop() {
    preference.removeEventListener('change', updatePreference)
    for (const animation of animations.values()) animation.cancel()
  }

  return {
    captureCloud,
    moveCloud,
    captureAlbums,
    moveAlbums,
    reveal,
    leaveArtist,
    stop,
  }
}

export function prepareAlbumLeave(element: Element) {
  const album = element as HTMLElement
  album.style.width = `${album.offsetWidth}px`
  album.style.left = `${album.offsetLeft}px`
  album.style.top = `${album.offsetTop}px`
  album.inert = true
}

export function resetAlbumLeave(element: Element) {
  const album = element as HTMLElement
  album.style.width = ''
  album.style.left = ''
  album.style.top = ''
  album.inert = false
}
