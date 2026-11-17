export interface ShareCardData {
  text: string
  title: string
  source?: { name: string; url: string }
  url: string
  english: boolean
}

export async function renderShareCard(
  data: ShareCardData,
  qr: HTMLCanvasElement,
  fontFamily: string
): Promise<Blob> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')

  const width = 640
  const padding = 56
  const contentWidth = width - padding * 2
  const segmenter = new Intl.Segmenter(data.english ? 'en' : 'zh', {
    granularity: 'word',
  })

  function lines(text: string, font: string, maxWidth: number): string[] {
    ctx!.font = font
    return text.split('\n').flatMap(paragraph => {
      const result: string[] = []
      let line = ''
      for (const { segment } of segmenter.segment(paragraph)) {
        if (ctx!.measureText(line + segment).width <= maxWidth) {
          line += segment
          continue
        }
        if (/^[，。！？；：、,.!?;:）】》」』]/u.test(segment)) {
          line += segment
          continue
        }
        if (line.trim()) result.push(line.trimEnd())
        line = segment.trimStart()
        if (ctx!.measureText(line).width > maxWidth) {
          let part = ''
          for (const character of line) {
            if (ctx!.measureText(part + character).width > maxWidth) {
              result.push(part)
              part = ''
            }
            part += character
          }
          line = part
        }
      }
      result.push(line.trimEnd())
      return result
    })
  }

  const quoteFont = `400 26px ${fontFamily}`
  const titleFont = `600 17px ${fontFamily}`
  const metaFont = `400 14px ${fontFamily}`
  const quote = lines(data.text, quoteFont, contentWidth)
  const title = lines(data.title, titleFont, contentWidth)
  const source = data.source
    ? lines(data.source.name, metaFont, contentWidth)
    : []
  const quoteBottom = padding + quote.length * 44
  const metaBottom = quoteBottom + 24 + title.length * 28 + source.length * 24
  const height = Math.max(320, metaBottom + 128)
  if (height > 1800) {
    throw new RangeError(
      data.english
        ? 'This excerpt is too long. Select a shorter passage.'
        : '选段过长，请缩短后再生成卡片。'
    )
  }

  canvas.width = width * 2
  canvas.height = height * 2
  ctx.scale(2, 2)
  ctx.fillStyle = '#faf9f6'
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#242320'
  ctx.font = quoteFont
  quote.forEach((line, index) =>
    ctx.fillText(line, padding, padding + index * 44)
  )

  let y = quoteBottom + 24
  ctx.font = titleFont
  title.forEach(line => {
    ctx.fillText(line, padding, y)
    y += 28
  })
  ctx.fillStyle = '#706e68'
  ctx.font = metaFont
  source.forEach(line => {
    ctx.fillText(line, padding, y)
    y += 24
  })

  ctx.fillStyle = '#706e68'
  ctx.font = metaFont
  ctx.fillText('sanjeev.top', padding, height - 72)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qr, width - padding - 72, height - 104, 72, 72)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG export failed'))
    }, 'image/png')
  })
}
