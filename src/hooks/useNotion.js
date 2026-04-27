import projects from '../data/projects.json'
import posts from '../data/posts.json'

// Data is fetched at build time by scripts/fetch-notion.js.
// This hook just exposes the static JSON — no runtime API calls.
export function useNotion() {
  return { projects, posts, loading: false, error: null }
}
