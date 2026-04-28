import 'dotenv/config'
import { Client } from '@notionhq/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')
const CASE_STUDIES_DIR = join(DATA_DIR, 'case-studies')

const notion = new Client({ auth: process.env.VITE_NOTION_TOKEN })
const PROJECTS_DB_ID = process.env.VITE_PROJECTS_DB_ID
const BLOG_DB_ID = process.env.VITE_BLOG_DB_ID

// ─── Property helpers ──────────────────────────────────────────────────────────

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

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Notion blocks → Markdown ──────────────────────────────────────────────────

function richText(fragments = []) {
  return fragments
    .map((t) => {
      let s = t.plain_text
      if (t.annotations?.code) s = `\`${s}\``
      if (t.annotations?.bold) s = `**${s}**`
      if (t.annotations?.italic) s = `*${s}*`
      if (t.annotations?.strikethrough) s = `~~${s}~~`
      if (t.href) s = `[${s}](${t.href})`
      return s
    })
    .join('')
}

function blockToMarkdown(block) {
  const { type } = block
  const data = block[type] ?? {}
  const text = richText(data.rich_text ?? [])

  switch (type) {
    case 'heading_1': return `# ${text}\n`
    case 'heading_2': return `## ${text}\n`
    case 'heading_3': return `### ${text}\n`
    case 'paragraph': return text ? `${text}\n` : ''
    case 'bulleted_list_item': return `- ${text}`
    case 'numbered_list_item': return `1. ${text}`
    case 'quote': return `> ${text}\n`
    case 'divider': return `---\n`
    case 'callout': return `> **${text}**\n`
    case 'code': {
      const lang = data.language ?? ''
      return `\`\`\`${lang}\n${text}\n\`\`\`\n`
    }
    case 'image': {
      const url = data.type === 'external' ? data.external?.url : data.file?.url
      const caption = richText(data.caption ?? [])
      return url ? `![${caption}](${url})\n` : ''
    }
    case 'embed':
    case 'bookmark': {
      const url = data.url ?? ''
      return url ? `[${url}](${url})\n` : ''
    }
    default: return ''
  }
}

async function fetchPageMarkdown(pageId) {
  const blocks = []
  let cursor

  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)

  return blocks
    .map(blockToMarkdown)
    .filter((l) => l !== '')
    .join('\n')
}

// ─── Fetch projects ────────────────────────────────────────────────────────────

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
    const name = getText(p.Name)
    return {
      id: page.id,
      slug: toSlug(name),
      name,
      tagline: getText(p.Tagline),
      category: getText(p.Category),
      featured: getText(p.Featured),
      link: getText(p.Link),
      order: getText(p.Order),
      videoURL: getText(p.VideoURL),
      attachmentURL: getText(p.AttachmentURL),
      caseStudyPageId: getText(p.CaseStudyPageId),
    }
  })
}

// ─── Fetch blog posts ──────────────────────────────────────────────────────────

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

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.VITE_NOTION_TOKEN) {
    console.warn('[fetch-notion] VITE_NOTION_TOKEN not set — skipping fetch, using existing data files.')
    process.exit(0)
  }

  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(CASE_STUDIES_DIR, { recursive: true })

  console.log('[fetch-notion] Fetching projects...')
  const projects = await fetchProjects()
  writeFileSync(join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2))
  console.log(`[fetch-notion] ✓ ${projects.length} projects written`)

  const withCaseStudy = projects.filter((p) => p.caseStudyPageId)
  if (withCaseStudy.length) {
    console.log(`[fetch-notion] Fetching ${withCaseStudy.length} case studies...`)
    await Promise.all(
      withCaseStudy.map(async (p) => {
        try {
          const markdown = await fetchPageMarkdown(p.caseStudyPageId)
          writeFileSync(
            join(CASE_STUDIES_DIR, `${p.slug}.json`),
            JSON.stringify({ slug: p.slug, markdown }, null, 2)
          )
          console.log(`[fetch-notion]   ✓ ${p.name}`)
        } catch (err) {
          console.warn(`[fetch-notion]   ✗ ${p.name}: ${err.message}`)
        }
      })
    )
  }

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
