export interface SiteConfig {
  id: string
  name: string
  domain: string
  hostFilter: string
  contentPath: string
  color: string
}

export const sitesConfig: SiteConfig[] = [
  {
    id: 'theadoptedson',
    name: 'The Adopted Son',
    domain: 'theadoptedson.com',
    hostFilter: '%theadoptedson.com',
    contentPath: '/devotionals/',
    color: '#6366f1', // indigo
  },
  {
    id: 'tektonstable',
    name: "Tekton's Table",
    domain: 'tektonstable.com',
    hostFilter: '%tektonstable.com',
    contentPath: '/blog/',
    color: '#10b981', // emerald
  },
  {
    id: 'fullstack',
    name: 'Fullstack',
    domain: 'wesshinn.com',
    hostFilter: '%wesshinn.com',
    contentPath: '/posts/',
    color: '#f59e0b', // amber
  },
]
