export interface SiteConfig {
  id: string
  name: string
  domain: string
  hostFilter: string | string[]
  contentPath: string
  color: string
}

export const sitesConfig: SiteConfig[] = [
  {
    id: 'theadoptedson',
    name: 'The Adopted Son',
    domain: 'theadoptedson.com',
    hostFilter: 'theadoptedson.com',
    contentPath: '/devotionals/',
    color: '#6366f1', // indigo
  },
  {
    id: 'tektonstable',
    name: "Tekton's Table",
    domain: 'tektonstable.com',
    hostFilter: 'tektonstable.com',
    contentPath: '/blog/',
    color: '#10b981', // emerald
  },
  {
    id: 'fullstack',
    name: 'Fullstack',
    domain: 'fullstack.wesshinn.com',
    hostFilter: 'fullstack.wesshinn.com',
    contentPath: '/posts/',
    color: '#f59e0b', // amber
  },
  {
    id: 'wesshinn',
    name: 'Wes Shinn',
    domain: 'wesshinn.com',
    hostFilter: ['wesshinn.com', 'www.wesshinn.com'],
    contentPath: '/blog/',
    color: '#ec4899', // pink
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    domain: 'portfolio.wesshinn.com',
    hostFilter: 'portfolio.wesshinn.com',
    contentPath: '/',
    color: '#8b5cf6', // violet
  },
]
