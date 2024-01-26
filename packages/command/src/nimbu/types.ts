export interface CountResult {
  count: number
}

export interface App {
  key: string
  name: string
  url?: string
}

export interface AppFile {
  code?: string
  created_at: string
  name: string
  updated_at: string
  url?: string
}

export interface User {
  email: string
  name: string
  url: string
  username: string
}

export interface Token {
  app: App
  created_at: string
  expired_at?: string
  expires_in?: number
  note?: string
  note_url?: string
  scopes: string[]
  site?: string
  site_wide: boolean
  token: string
  updated_at: string
  url?: string
}

export interface Site extends Record<string, unknown> {
  domain: string
  domain_url: string
  id: string
  name: string
  subdomain: string
  url: string
}

export interface NotificationTranslation {
  html?: string
  subject: string
  text: string
}

export interface Notification {
  created_at: string
  description: string
  html?: string
  html_enabled: boolean
  id: string
  name: string
  slug: string
  subject: string
  text: string
  translations?: {
    [locale: string]: NotificationTranslation
  }
  updated_at: string
  url: string
}
