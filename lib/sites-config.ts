export interface SiteConfig {
  id: string
  name: string
  domain: string
  hostFilter: string
  contentPath: string
}

export const sitesConfig: SiteConfig[] = [
  {
    id: 'theadoptedson',
    name: 'The Adopted Son',
    domain: 'theadoptedson.com',
    hostFilter: '%theadoptedson.com',
    contentPath: '/devotionals/',
  },
  {
    id: 'tektonstable',
    name: "Tekton's Table",
    domain: 'tektonstable.com',
    hostFilter: '%tektonstable.com',
    contentPath: '/blog/',
  },
  {
    id: 'fullstack',
    name: 'Fullstack',
    domain: 'wesshinn.com',
    hostFilter: '%wesshinn.com',
    contentPath: '/posts/',
  },
]
