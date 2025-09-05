
import type { UrlAuditReport, SeoCheckResult } from '../types.js';
import { SeoCheckStatus } from '../types.js';

const getRandomStatus = (): SeoCheckStatus => {
  const rand = Math.random();
  if (rand < 0.6) return SeoCheckStatus.Pass;
  if (rand < 0.85) return SeoCheckStatus.Warning;
  return SeoCheckStatus.Fail;
};

const SEO_CHECKS_TEMPLATES: { [key: string]: (status: SeoCheckStatus) => SeoCheckResult } = {
  'Meta Title': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Title length is optimal (55 characters).',
      [SeoCheckStatus.Warning]: 'Title is slightly short (35 characters). Consider adding more relevant keywords.',
      [SeoCheckStatus.Fail]: 'Title is too long (75 characters). Recommended: < 60 characters.',
    };
    return { checkName: 'Meta Title', status, message: messages[status] };
  },
  'Meta Description': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Description length is optimal (150 characters).',
      [SeoCheckStatus.Warning]: 'Description not found. This is a missed opportunity for SERP visibility.',
      [SeoCheckStatus.Fail]: 'Description is too short (80 characters). Recommended: 120-160 characters.',
    };
    return { checkName: 'Meta Description', status, message: messages[status] };
  },
  'H1 Tag': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Exactly one H1 tag found.',
      [SeoCheckStatus.Warning]: 'H1 tag is missing. Every page should have a primary heading.',
      [SeoCheckStatus.Fail]: 'Multiple H1 tags found (3). Use only one H1 per page.',
    };
    return { checkName: 'H1 Tag', status, message: messages[status] };
  },
  'Canonical Tag': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Canonical tag is correctly implemented.',
      [SeoCheckStatus.Warning]: 'Canonical tag points to a different URL. Verify this is intentional.',
      [SeoCheckStatus.Fail]: 'Canonical tag not found, which can lead to duplicate content issues.',
    };
    return { checkName: 'Canonical Tag', status, message: messages[status] };
  },
  'Image Alt Text': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'All 25 images have alt text.',
      [SeoCheckStatus.Warning]: '80% of images (20/25) have alt text. Missing alt text on 5 images.',
      [SeoCheckStatus.Fail]: 'Only 30% of images (8/25) have alt text. This impacts accessibility and image SEO.',
    };
    return { checkName: 'Image Alt Text', status, message: messages[status] };
  },
  'Schema Markup': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Article and Breadcrumb schema found and valid.',
      [SeoCheckStatus.Warning]: 'Schema markup detected, but with some warnings.',
      [SeoCheckStatus.Fail]: 'No schema markup detected. This is a missed opportunity for rich snippets.',
    };
    return { checkName: 'Schema Markup', status, message: messages[status] };
  },
  'Open Graph Tags': (status) => {
    const messages = {
      [SeoCheckStatus.Pass]: 'Open Graph tags (og:title, og:description, og:image) are present.',
      [SeoCheckStatus.Warning]: 'og:image tag is missing. Social sharing previews may be suboptimal.',
      [SeoCheckStatus.Fail]: 'No Open Graph tags found. Social sharing will lack rich context.',
    };
    return { checkName: 'Open Graph Tags', status, message: messages[status] };
  },
};

const generateMockSeoChecks = (): SeoCheckResult[] => {
  return Object.values(SEO_CHECKS_TEMPLATES).map((templateFn) => {
    const status = getRandomStatus();
    return templateFn(status);
  });
};

const generateSubPages = (domain: string, count: number): string[] => {
    const cleanedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const commonPaths = ['/about', '/contact', '/services', '/blog', '/products', '/faq', '/careers', '/pricing', '/portfolio', '/case-studies'];
    const blogPaths = Array.from({ length: 5 }, (_, i) => `/blog/post-${i + 1}-common-topic`);
    
    const allPaths = [...commonPaths, ...blogPaths];
    const shuffled = allPaths.sort(() => 0.5 - Math.random());
    
    const urls = new Set<string>([`https://${cleanedDomain}/`]);
    
    for (let i = 0; i < count -1 && i < shuffled.length; i++) {
        urls.add(`https://${cleanedDomain}${shuffled[i]}`);
    }
    
    return Array.from(urls);
};

export const generateMockAuditReports = (domain: string, count: number): UrlAuditReport[] => {
  const urls = generateSubPages(domain, count);
  return urls.map((url, index) => ({
    id: `report-${index}-${Date.now()}`,
    url,
    seoChecks: generateMockSeoChecks(),
    seoScore: Math.floor(Math.random() * 51) + 50, // Mock score between 50-100
    geoScore: Math.floor(Math.random() * 51) + 50, // Mock score between 50-100
  }));
};