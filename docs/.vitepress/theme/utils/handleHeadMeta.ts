import { type HeadConfig, type TransformContext } from "vitepress";

// 处理每个页面的元数据
export function handleHeadMeta(context: TransformContext) {
  const { description, title, relativePath, frontmatter } = context.pageData;

  const curDesc = description || context.description;
  const cover = frontmatter.cover || 'https://justin3go.com/bg.jpg'
  const cardType = frontmatter.cover ? 'summary_large_image' : 'summary'
  // 增加 Twitter 卡片
  const ogUrl: HeadConfig = ["meta", { property: "og:url", content: addBase(relativePath) }]
  const ogTitle: HeadConfig = ["meta", { property: "og:title", content: title }]
  const ogDescription: HeadConfig = ["meta", { property: "og:description", content: curDesc }]
  const ogImage: HeadConfig = ["meta", { property: "og:image", content: cover }]
  const twitterCard: HeadConfig = ["meta", { name: "twitter:card", content: cardType }]
  const twitterImage: HeadConfig = ["meta", { name: "twitter:image:src", content: cover }]
  const twitterDescription: HeadConfig = ["meta", { name: "twitter:description", content: curDesc }]

  const twitterHead: HeadConfig[] = [
    ogUrl, ogTitle, ogDescription, ogImage,
    twitterCard, twitterDescription, twitterImage,
  ]

  // 预加载字体
  const preloadHead: HeadConfig[] = handleFontsPreload(context)

  return [...twitterHead, ...preloadHead]
}

export function addBase(relativePath: string) {
  const host = 'https://justin3go.com'
  if (relativePath.startsWith('/')) {
    return host + relativePath
  } else {
    return host + '/' + relativePath
  }
}

export function handleFontsPreload({ assets }: TransformContext) {
  const SourceHanSerifCN = assets.find(file => /SourceHanSerifCN-VF\.\w+\.otf/)
  const FiraCode = assets.find(file => /FiraCode-VF\.\w+\.woff2/)
  const Niconne = assets.find(file => /Niconne-Regular\.\w+\.ttf/)

  return [
    SourceHanSerifCN && [
      'link',
      {
        rel: 'preload',
        href: SourceHanSerifCN,
        as: 'font',
        type: 'font/otf',
        crossorigin: ''
      }
    ],
    FiraCode && [
      'link',
      {
        rel: 'preload',
        href: FiraCode,
        as: 'font',
        type: 'font/woff2',
        crossorigin: ''
      }
    ],
    Niconne && [
      'link',
      {
        rel: 'preload',
        href: Niconne,
        as: 'font',
        type: 'font/ttf',
        crossorigin: ''
      }
    ]
  ].filter(Boolean) as HeadConfig[]
}
