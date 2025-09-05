export enum SeoCheckStatus {
  Pass = 'Pass',
  Fail = 'Fail',
  Warning = 'Warning',
}

export interface SeoCheckResult {
  checkName: string;
  status: SeoCheckStatus;
  message: string;
  data?: string | string[] | Record<string, any>;
}

export interface UrlAuditReport {
  id: string;
  url: string;
  seoChecks: SeoCheckResult[];
  seoScore: number;
  geoScore: number;
}

export type AuditMode = 'crawl' | 'sitemap' | 'single' | 'custom';

export interface SitemapParseResult {
  type: 'index' | 'urlset';
  urls: string[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  options?: { label: string; prompt: string }[];
}