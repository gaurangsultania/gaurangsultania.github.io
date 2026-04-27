import 'dotenv/config'
import { Client } from '@notionhq/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')

const notion = new Client({ auth: process.env.VITE_NOTION_TOKEN })
const PROJECTS_DB_ID = process.env.VITE_PROJECTS_DB_ID
const BLOG_DB_ID = process.env.VITE_BLOG_DB_ID

function getText(prop) {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title.map((t) => t.plain_text).join('')
  if (prop.type === 'rich_text') return prop.rich_text.map((t) => t.plain_text).join('')
  if (prop.type === 'select') return prop.select?.name ?? ''
  if (prop.type === 'multi_select') return prop.multi_select.map((s) => s.name)
  if (prop.type === 'checkbox') return prop.checkbox
  if (prop.type === 'number') return prop.number
  if (prop.type === 'url') return prop.url ?? ''
  if (prop.type === 'date') return prop.date?.start ?? ''
  return ''
}

async function fetchProjects() {
  const res = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    sorts: [
      { property: 'Featured', direction: 'descending' },
      { property: 'Order', direction: 'ascending' },
    ],
  })

  return res.results.map((page) => {
    const p = page.properties
    return {
      id: page.id,
      name: getText(p.Name),
      tagline: getText(p.Tagline),
      category: getText(p.Category),
      featured: getText(p.Featured),
      link: getText(p.Link),
      order: getText(p.Order),
    }
  })
}

async function fetchBlogPosts() {
  const res = await notion.databases.query({
    database_id: BLOG_DB_ID,
    filter: { property: 'Published', checkbox: { equals: true } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  })

  return res.results.map((page) => {
    const p = page.properties
    return {
      id: page.id,
      title: getText(p.Title ?? p.Name),
      summary: getText(p.Summary),
      date: getText(p.Date),
      slug: getText(p.Slug),
      link: getText(p.Link),
      tags: getText(p.Tags) || [],
    }
  })
}

async function main() {
  if (!process.env.VITE_NOTION_TOKEN) {
    console.warn('[fetch-notion] VITE_NOTION_TOKEN not set — skipping fetch, using existing data files.')
    process.exit(0)
  }

  mkdirSync(DATA_DIR, { recursive: true })

  console.log('[fetch-notion] Fetching projects...')
  const projects = await fetchProjects()
  writeFileSync(join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2))
  console.log(`[fetch-notion] ✓ ${projects.length} projects written`)

  console.log('[fetch-notion] Fetching blog posts...')
  const posts = await fetchBlogPosts()
  writeFileSync(join(DATA_DIR, 'posts.json'), JSON.stringify(posts, null, 2))
  console.log(`[fetch-notion] ✓ ${posts.length} posts written`)
}

main().catch((err) => {
  const isAuthError = err.code === 'unauthorized' || err.status === 401
  if (isAuthError) {
    console.warn('[fetch-notion] Invalid or missing Notion token — skipping fetch, using existing data files.')
    process.exit(0)
  }
  console.error('[fetch-notion] Error:', err.message)
  process.exit(1)
})
