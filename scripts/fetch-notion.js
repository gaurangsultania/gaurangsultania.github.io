import 'dotenv/config'
import { Client } from '@notionhq/client'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const DATA_DIR   = join(__dirname, '..', 'src', 'data')
const CASE_DIR   = join(DATA_DIR, 'case-studies')
const IMAGES_DIR = join(__dirname, '..', 'public', 'assets', 'images')

const notion          = new Client({ auth: process.env.VITE_NOTION_TOKEN })
const PROJECTS_DB_ID  = process.env.VITE_PROJECTS_DB_ID
const BLOG_DB_ID      = process.env.VITE_BLOG_DB_ID

// ─── Property helpers ──────────────────────────────────────────────────────────

function getText(prop) {
  if (!prop) return ''
  if (prop.type === 'title')        return prop.title.map((t) => t.plain_text).join('')
  if (prop.type === 'rich_text')    return prop.rich_text.map((t) => t.plain_text).join('')
  if (prop.type === 'select')       return prop.select?.name ?? ''
  if (prop.type === 'multi_select') return prop.multi_select.map((s) => s.name)
  if (prop.type === 'checkbox')     return prop.checkbox
  if (prop.type === 'number')       return prop.number
  if (prop.type === 'url')          return prop.url ?? ''
  if (prop.type === 'date')         return prop.date?.start ?? ''
  return ''
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Fix 3: rich_text → Markdown (bold trailing-space edge case) ───────────────
// WRONG: **TripTalk, **   RIGHT: **TripTalk,**
// The space must live OUTSIDE the closing **, not inside it.

function richText(fragments = []) {
  return fragments
    .map((t) => {
      let s = t.plain_text
      if (t.annotations?.code) s = `\`${s}\``
      if (t.annotations?.bold) {
        const core  = s.trimEnd()
        const trail = s.slice(core.length)   // preserve any trailing whitespace
        s = `**${core}**${trail}`
      }
      if (t.annotations?.italic)        s = `*${s}*`
      if (t.annotations?.strikethrough) s = `~~${s}~~`
      if (t.href) s = `[${s}](${t.href})`
      return s
    })
    .join('')
}

// ─── Fix 2: image downloading — Notion S3 URLs expire in 3600 s ───────────────

function isS3Url(url) {
  return Boolean(url && (url.includes('prod-files-secure.s3') || url.includes('X-Amz')))
}

function extFromUrl(url) {
  try {
    const p = new URL(url).pathname.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(p)) return p === 'jpeg' ? 'jpg' : p
  } catch {}
  return null
}

function extFromContentType(ct = '') {
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
  if (ct.includes('png'))  return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif'))  return 'gif'
  return 'jpg'
}

async function downloadImage(blockId, url) {
  // Return cached file if already downloaded (any extension)
  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    const p = join(IMAGES_DIR, `${blockId}.${ext}`)
    if (existsSync(p)) return `/assets/images/${blockId}.${ext}`
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ext      = extFromUrl(url) ?? extFromContentType(res.headers.get('content-type'))
    const filename = `${blockId}.${ext}`
    writeFileSync(join(IMAGES_DIR, filename), Buffer.from(await res.arrayBuffer()))
    console.log(`[fetch-notion]     ↳ saved image ${filename}`)
    return `/assets/images/${filename}`
  } catch (err) {
    console.warn(`[fetch-notion]   ⚠ image download failed (${blockId}): ${err.message}`)
    return url  // fall back — better than a broken build
  }
}

// ─── Shared: fetch all children of any block ──────────────────────────────────

async function fetchBlockChildren(blockId) {
  const blocks = []
  let cursor
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  return blocks
}

// Convenience alias kept for readability at call sites
const fetchTableRows = fetchBlockChildren

function tableToMarkdown(block) {
  const rows      = block._rows ?? []
  if (rows.length === 0) return ''

  const hasHeader = block.table?.has_column_header ?? false
  const colCount  = rows[0]?.table_row?.cells?.length ?? 0
  if (colCount === 0) return ''

  const separator  = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
  const renderRow  = (row) => {
    const cells = row.table_row?.cells ?? []
    return '| ' + cells.map((cell) => richText(cell).replace(/\|/g, '\\|') || ' ').join(' | ') + ' |'
  }

  const mdRows = rows.map(renderRow)

  if (hasHeader) {
    return [mdRows[0], separator, ...mdRows.slice(1)].join('\n') + '\n'
  } else {
    const emptyHeader = '| ' + Array(colCount).fill(' ').join(' | ') + ' |'
    return [emptyHeader, separator, ...mdRows].join('\n') + '\n'
  }
}

// ─── Block → Markdown (depth-aware for nested lists) ──────────────────────────
// depth controls the leading indentation so react-markdown parses
// nested bulleted/numbered items as true nested <ul>/<ol> elements.

function blockToMarkdown(block, depth = 0) {
  const { type } = block
  const data   = block[type] ?? {}
  const text   = richText(data.rich_text ?? [])
  const indent = '  '.repeat(depth)   // 2 spaces per nesting level

  let line = ''

  switch (type) {
    case 'heading_1': line = `# ${text}\n`; break
    case 'heading_2': line = `## ${text}\n`; break
    case 'heading_3': line = `### ${text}\n`; break
    // Paragraphs never carry indentation — 4+ leading spaces = code block in CommonMark
    case 'paragraph': line = text ? `${text}\n` : ''; break
    case 'bulleted_list_item':  line = `${indent}- ${text}`; break
    case 'numbered_list_item':  line = `${indent}1. ${text}`; break
    case 'quote':   line = `${indent}> ${text}\n`; break
    case 'divider': line = `---\n`; break
    case 'callout': line = `${indent}> **${text}**\n`; break
    case 'code': {
      const lang = data.language ?? ''
      line = `\`\`\`${lang}\n${text}\n\`\`\`\n`; break
    }
    case 'table': line = tableToMarkdown(block); break
    case 'image': {
      const url     = block._localUrl ?? (data.type === 'external' ? data.external?.url : data.file?.url)
      const caption = richText(data.caption ?? [])
      line = url ? `![${caption}](${url})\n` : ''; break
    }
    case 'embed':
    case 'bookmark': {
      const url = data.url ?? ''
      line = url ? `[${url}](${url})\n` : ''; break
    }
    default: line = ''
  }

  // Append nested children.
  // Only list items increase the indentation depth — paragraphs, quotes,
  // callouts etc. act as containers in Notion but should not push their
  // children deeper in the markdown output.
  if (block._children?.length) {
    const isList     = type === 'bulleted_list_item' || type === 'numbered_list_item'
    const childDepth = isList ? depth + 1 : depth
    const childMd = block._children
      .map((child) => blockToMarkdown(child, childDepth))
      .filter(Boolean)
      .join('\n')
    if (childMd) line = line + '\n' + childMd
  }

  return line
}

// ─── Post-processing: normalise list indentation ──────────────────────────────
// Notion pages can be deeply nested (11-30+ levels) because every Tab press
// makes a block a child of the one above.  After block→markdown conversion,
// list items carry that absolute depth as leading spaces.  We:
//   1. Find the minimum list-item indentation across the whole page.
//   2. Subtract it from every list line so the shallowest bullet lands at col 0.
//   3. Cap the resulting relative depth at MAX_LIST_DEPTH to prevent
//      runaway CSS paddingLeft stacking in the renderer.

const MAX_LIST_DEPTH = 4  // levels (= 8 spaces at 2 spaces/level)

function normalizeListIndents(markdown) {
  const lines = markdown.split('\n')

  // Measure minimum indentation of any list marker line
  let minIndent = Infinity
  for (const line of lines) {
    const m = line.match(/^(\s+)(?:-\s|\d+\.\s)/)
    if (m) minIndent = Math.min(minIndent, m[1].length)
  }
  if (!isFinite(minIndent) || minIndent === 0) return markdown

  return lines
    .map((line) => {
      const listMatch = line.match(/^(\s+)((?:-\s|\d+\.\s).*)/)
      if (!listMatch) return line
      const raw        = listMatch[1].length - minIndent          // normalised depth * 2
      const capped     = Math.min(raw, MAX_LIST_DEPTH * 2)        // cap
      return ' '.repeat(Math.max(0, capped)) + listMatch[2]
    })
    .join('\n')
}

// ─── Block types whose children represent meaningful nested content ────────────
const CHILD_BLOCK_TYPES = new Set([
  'bulleted_list_item',
  'numbered_list_item',
  'paragraph',
  'quote',
  'callout',
  'toggle',
])

// Recursively enrich a single block (tables, images, nested children)
async function enrichBlock(block) {
  // Fix 1 — table rows (children of table blocks are table_row blocks)
  if (block.type === 'table') {
    block._rows = await fetchBlockChildren(block.id)
  }

  // Fix 2 — download expiring S3 images
  if (block.type === 'image') {
    const d   = block.image ?? {}
    const url = d.type === 'external' ? d.external?.url : d.file?.url
    if (isS3Url(url)) {
      block._localUrl = await downloadImage(block.id, url)
    }
  }

  // Sub-points — any list item (or paragraph/quote) with has_children
  // is a parent node whose children are the indented sub-bullets
  if (block.has_children && CHILD_BLOCK_TYPES.has(block.type)) {
    const children = await fetchBlockChildren(block.id)
    // Recurse: each child may itself have children
    await Promise.all(children.map(enrichBlock))
    block._children = children
  }
}

// ─── Fetch page blocks + enrich (tables, images) in one pass ──────────────────

async function fetchPageMarkdown(pageId) {
  // 1. Fetch all top-level blocks
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

  // 2. Enrich blocks recursively (parallel per sibling, sequential per depth)
  await Promise.all(blocks.map(enrichBlock))

  // 3. Convert to markdown, then normalise list indentation
  const raw = blocks.map((b) => blockToMarkdown(b, 0)).filter(Boolean).join('\n')
  return normalizeListIndents(raw)
}

// ─── Fetch projects ────────────────────────────────────────────────────────────

async function fetchProjects() {
  const res = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    sorts: [
      { property: 'Featured', direction: 'descending' },
      { property: 'Order',    direction: 'ascending'  },
    ],
  })

  return res.results.map((page) => {
    const p    = page.properties
    const name = getText(p.Name)
    return {
      id:               page.id,
      slug:             toSlug(name),
      name,
      tagline:          getText(p.Tagline),
      category:         getText(p.Category),
      featured:         getText(p.Featured),
      link:             getText(p.Link),
      order:            getText(p.Order),
      videoURL:         getText(p.VideoURL),
      attachmentURL:    getText(p.AttachmentURL),
      caseStudyPageId:  getText(p.CaseStudyPageId),
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
      id:      page.id,
      title:   getText(p.Title ?? p.Name),
      summary: getText(p.Summary),
      date:    getText(p.Date),
      slug:    getText(p.Slug),
      link:    getText(p.Link),
      tags:    getText(p.Tags) || [],
    }
  })
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.VITE_NOTION_TOKEN) {
    console.warn('[fetch-notion] VITE_NOTION_TOKEN not set — skipping fetch, using existing data files.')
    process.exit(0)
  }

  mkdirSync(DATA_DIR,   { recursive: true })
  mkdirSync(CASE_DIR,   { recursive: true })
  mkdirSync(IMAGES_DIR, { recursive: true })

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
            join(CASE_DIR, `${p.slug}.json`),
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
  const isAuth = err.code === 'unauthorized' || err.status === 401
  if (isAuth) {
    console.warn('[fetch-notion] Invalid or missing Notion token — skipping fetch, using existing data files.')
    process.exit(0)
  }
  console.error('[fetch-notion] Error:', err.message)
  process.exit(1)
})
