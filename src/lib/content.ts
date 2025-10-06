export type TeamMember = { name: string; role: string; avatar?: string; bio?: string; order?: number; published?: boolean }

export async function getTeam(): Promise<TeamMember[]> {
  const modules = import.meta.glob('/content/team/*.json', { eager: true, import: 'default' }) as Record<string, TeamMember>
  const list = Object.values(modules)
  return list
    .filter(m => m.published !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

export type Post = { title: string; date: string; cover?: string; body?: string; published?: boolean; slug?: string }
export async function getPosts(): Promise<Post[]> {
  const modules = import.meta.glob('/content/posts/*.md', { eager: true, as: 'raw' })
  const posts: Post[] = []
  for (const path in modules) {
    const raw = modules[path] as unknown as string
    const firstLine = raw.split('\n')[0] || ''
    const title = firstLine.replace(/^#\s+/, '') || 'Bez tytułu'
    const date = path.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || new Date().toISOString()
    const slug = path.split('/').pop()?.replace(/\.md$/, '')
    posts.push({ title, date, body: raw, slug })
  }
  return posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export type Project = { title: string; date: string; cover?: string; body?: string; tags?: string[]; published?: boolean }
export async function getProjects(): Promise<Project[]> {
  const modules = import.meta.glob('/content/projects/*.md', { eager: true, as: 'raw' })
  const projects: Project[] = []
  for (const path in modules) {
    const raw = modules[path] as unknown as string
    const firstLine = raw.split('\n')[0] || ''
    const title = firstLine.replace(/^#\s+/, '') || 'Projekt'
    const date = '2024-01-01'
    projects.push({ title, date, body: raw })
  }
  return projects
}

export type SiteSettings = { name: string; tagline?: string; logo?: string; colors?: { brand: string; base100: string; base200: string; text: string } }
export async function getSettings(): Promise<SiteSettings> {
  const mod = (await import('/content/settings/site.json')).default as SiteSettings
  return mod
}