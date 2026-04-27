import { Client } from '@notionhq/client'

const notion = new Client({ auth: import.meta.env.VITE_NOTION_TOKEN })

const PROJECTS_DB_ID = import.meta.env.VITE_PROJECTS_DB_ID
const BLOG_DB_ID = import.meta.env.VITE_BLOG_DB_ID

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

export async function getProjects() {
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

export async function getBlogPosts() {
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
