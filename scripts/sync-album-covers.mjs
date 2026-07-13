import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'

const albumsFile = new URL(
  '../docs/.vitepress/data/albums.json',
  import.meta.url
)
const outputDirectory = new URL(
  '../docs/public/images/albums/',
  import.meta.url
)
const force = process.argv.includes('--force')

const albumCollection = JSON.parse(await readFile(albumsFile, 'utf8'))

await mkdir(outputDirectory, { recursive: true })

const existingCovers = new Set(await readdir(outputDirectory))

for (const album of albumCollection.albums) {
  const filename = `${album.id}.jpg`

  if (!force && existingCovers.has(filename)) {
    console.log(`Skipping ${filename}`)
    continue
  }

  console.log(`Downloading ${filename}`)

  const response = await fetch(album.cover)

  if (!response.ok) {
    throw new Error(
      `Failed to download ${album.cover}: ${response.status} ${response.statusText}`
    )
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]

  if (contentType !== 'image/jpeg') {
    throw new Error(`Expected JPEG for ${album.cover}, received ${contentType}`)
  }

  const image = Buffer.from(await response.arrayBuffer())

  await writeFile(new URL(filename, outputDirectory), image)
}
