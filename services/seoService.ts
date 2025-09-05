
import type { UrlAuditReport, SeoCheckResult, SitemapParseResult } from '../types.js';
import { SeoCheckStatus } from '../types.js';

// NOTE: Using a CORS proxy that returns JSON to get metadata like final URL and status code.
const CORS_PROXY_URL = 'https://api.allorigins.win/get?url=';
const MAX_PAGES_TO_AUDIT = 12;

// --- Helper Types for Proxies ---

// Add type definition for the CORS proxy response to ensure type safety.
interface AllOriginsResponse {
    contents: string | null;
    status: {
        url: string;
        content_type: string;
        http_code: number;
        response_time: number;
        content_length: number;
    };
}

// --- Helper Functions ---

/**
 * Fetches content using a primary proxy and falls back to a secondary proxy on failure.
 * This is suitable for fetching raw content, as it doesn't standardize metadata like status codes.
 * @param url The URL to fetch.
 * @param signal AbortSignal for the request.
 * @returns The fetched content as a string.
 */
const fetchContentWithFallback = async (url: string, signal?: AbortSignal): Promise<string> => {
    // --- Primary Proxy: allorigins.win
    try {
        const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(url)}`, { signal });
        if (!response.ok) {
             throw new Error(`Primary proxy request failed: ${response.status}`);
        }
        const data: AllOriginsResponse = await response.json();
        if (data.contents === null) {
            throw new Error(`Target URL could not be reached via primary proxy (Status: ${data.status?.http_code})`);
        }
        return data.contents;
    } catch(e) {
        console.warn('Primary proxy failed:', e instanceof Error ? e.message : String(e));
    }
    
    // --- Fallback Proxy: codetabs.com
    try {
        console.log('Trying fallback proxy for:', url);
        const fallbackProxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const response = await fetch(fallbackProxyUrl, { signal });
        if (!response.ok) {
            throw new Error(`Fallback proxy request failed: ${response.status}`);
        }
        const text = await response.text();
        // This proxy returns a JSON with an "error" key on failure.
        if (text.startsWith('{"error"')) {
             try {
                const errorJson = JSON.parse(text);
                throw new Error(`Fallback proxy error: ${errorJson.error}`);
             } catch(jsonError) {
                throw new Error('Fallback proxy returned an unparseable error.');
             }
        }
        return text;
    } catch(e) {
        console.error('Fallback proxy also failed.');
        throw e; // Re-throw the error from the fallback attempt to be caught by the retry logic.
    }
};


// --- Individual SEO Check Functions ---

const checkMetaTitle = (doc: Document): SeoCheckResult => {
  const title = (doc.querySelector('title')?.textContent || '').trim();
  if (!title) {
    return { checkName: 'Meta Title', status: SeoCheckStatus.Fail, message: 'Meta title is missing.', data: 'Not found' };
  }
  if (title.length > 60) {
     return { checkName: 'Meta Title', status: SeoCheckStatus.Warning, message: `Title is too long (${title.length} characters). Recommended: <= 60.`, data: title };
  }
  return { checkName: 'Meta Title', status: SeoCheckStatus.Pass, message: `Title length is optimal (${title.length} characters).`, data: title };
};

const checkMetaDescription = (doc: Document): SeoCheckResult => {
  const description = (doc.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim();
  if (!description) {
      return { checkName: 'Meta Description', status: SeoCheckStatus.Fail, message: 'Meta description is missing.', data: 'Not found' };
  }
  if (description.length < 70) {
      return { checkName: 'Meta Description', status: SeoCheckStatus.Warning, message: `Description is too short (${description.length} characters). Recommended: 70-160.`, data: description };
  }
  if (description.length > 160) {
      return { checkName: 'Meta Description', status: SeoCheckStatus.Warning, message: `Description is too long (${description.length} characters). Recommended: 70-160.`, data: description };
  }
  return { checkName: 'Meta Description', status: SeoCheckStatus.Pass, message: `Description length is optimal (${description.length} characters).`, data: description };
};

const checkH1Tag = (doc: Document): SeoCheckResult => {
    const h1s = doc.querySelectorAll('h1');
    if (h1s.length === 1) {
        return { checkName: 'H1 Tag', status: SeoCheckStatus.Pass, message: 'Exactly one H1 tag found.', data: h1s[0].textContent?.trim() || '' };
    }
    if (h1s.length === 0) {
        return { checkName: 'H1 Tag', status: SeoCheckStatus.Fail, message: 'H1 tag is missing.', data: 'Not found' };
    }
    return { 
        checkName: 'H1 Tag', 
        status: SeoCheckStatus.Fail, 
        message: `Multiple H1 tags found (${h1s.length}). Use only one H1 per page.`,
        data: Array.from(h1s).map(h => h.textContent?.trim() || '')
    };
};

const checkCanonicalTag = (doc: Document): SeoCheckResult => {
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) {
      return { checkName: 'Canonical Tag', status: SeoCheckStatus.Fail, message: 'Canonical tag not found, which can lead to duplicate content issues.', data: 'Not found' };
  }
  const href = canonical.getAttribute('href');
  return { checkName: 'Canonical Tag', status: SeoCheckStatus.Pass, message: `Canonical tag is implemented.`, data: href };
};

const checkImageAltText = (doc: Document): SeoCheckResult => {
    const allImages = Array.from(doc.querySelectorAll('img'));
    const uniqueImageSrcs = new Set<string>();

    const validImages = allImages.filter(img => {
        const src = img.src;
        if (!src || src.startsWith('data:') || uniqueImageSrcs.has(src)) {
            return false;
        }

        // Check for tracking pixels by size or filename
        if ((img.naturalWidth === 1 && img.naturalHeight === 1) || src.includes('pixel')) {
            return false;
        }

        // Check for visibility
        if (img.style.display === 'none' || img.offsetParent === null) {
           // A simplified visibility check. A more robust one would check computed styles.
           // For this context, offsetParent is a good-enough proxy.
           if (window.getComputedStyle(img).display === 'none') return false;
        }

        uniqueImageSrcs.add(src);
        return true;
    });

    const totalImages = validImages.length;

    if (totalImages === 0) {
        return { 
            checkName: 'Image Alt Text', 
            status: SeoCheckStatus.Pass, 
            message: 'No unique, content-relevant images found to audit.', 
            data: { Total: 0, MissingALT: 0 } 
        };
    }

    const missingAltImages = validImages.filter(img => !img.alt || img.alt.trim() === '');
    const missingAltCount = missingAltImages.length;

    const data = {
        'Total': totalImages,
        'MissingALT': missingAltCount
    };

    if (missingAltCount === 0) {
        return {
            checkName: 'Image Alt Text',
            status: SeoCheckStatus.Pass,
            message: `All ${totalImages} images have alt text.`,
            data
        };
    }

    const percentMissing = Math.round((missingAltCount / totalImages) * 100);
    
    if (percentMissing >= 50) {
        return {
            checkName: 'Image Alt Text',
            status: SeoCheckStatus.Fail,
            message: `Critical: ${missingAltCount} of ${totalImages} images (${percentMissing}%) missing alt text.`,
            data
        };
    }

    return {
        checkName: 'Image Alt Text',
        status: SeoCheckStatus.Warning,
        message: `Missing alt text on ${missingAltCount} of ${totalImages} images (${percentMissing}%).`,
        data
    };
};

const checkSchemaMarkup = (doc: Document): SeoCheckResult => {
    const detectedTypes = new Set<string>();

    // 1. Check for JSON-LD
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
            const json = JSON.parse(script.textContent || '{}');
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
                if (item && item['@type']) {
                    const type = item['@type'];
                    if (Array.isArray(type)) {
                        type.forEach(t => typeof t === 'string' && detectedTypes.add(t));
                    } else if (typeof type === 'string') {
                        detectedTypes.add(type);
                    }
                }
            }
        } catch (e) {
            // Silently fail if JSON is malformed, as it's a content issue.
        }
    });

    // 2. Check for Microdata
    doc.querySelectorAll('[itemscope][itemtype]').forEach(element => {
        const itemTypeUrl = element.getAttribute('itemtype');
        if (itemTypeUrl) {
            try {
                // Extract the type from URL like https://schema.org/Article
                const url = new URL(itemTypeUrl);
                const pathParts = url.pathname.split('/');
                const type = pathParts.filter(Boolean).pop(); // Get last non-empty part
                if (type) {
                    detectedTypes.add(type);
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
    });
    
    const typesArray = Array.from(detectedTypes);

    if (typesArray.length > 0) {
        const typesString = typesArray.join(', ');
        return {
            checkName: 'Schema Markup',
            status: SeoCheckStatus.Pass,
            message: `Schema markup detected. Found ${typesArray.length} type(s).`,
            data: { "Detected Types": typesString }
        };
    } else {
        return {
            checkName: 'Schema Markup',
            status: SeoCheckStatus.Fail,
            message: 'No schema markup detected.',
            data: 'Not Present'
        };
    }
};

const checkOpenGraphTags = (doc: Document): SeoCheckResult => {
    const tags = ['og:title', 'og:description', 'og:image'];
    const extractedData: Record<string, string> = {};
    const missing: string[] = [];

    tags.forEach(tag => {
        const element = doc.querySelector(`meta[property="${tag}"]`);
        const content = element?.getAttribute('content');
        if (content) {
            extractedData[tag] = content;
        } else {
            missing.push(tag);
        }
    });
    
    if (missing.length === 0) {
        return { checkName: 'Open Graph Tags', status: SeoCheckStatus.Pass, message: 'All key Open Graph tags are present.', data: extractedData };
    }
    if (missing.length === tags.length) {
        return { checkName: 'Open Graph Tags', status: SeoCheckStatus.Fail, message: 'No Open Graph tags found.', data: 'Not found' };
    }
    return { checkName: 'Open Graph Tags', status: SeoCheckStatus.Warning, message: `Missing key tags: ${missing.join(', ')}.`, data: extractedData };
};

const checkMetaRobots = (doc: Document): SeoCheckResult => {
    const metaRobots = doc.querySelector('meta[name="robots"]')?.getAttribute('content')?.toLowerCase();
    if (!metaRobots) {
        return { checkName: 'Meta Robots', status: SeoCheckStatus.Pass, message: 'Meta robots tag not found, defaulting to "index, follow".', data: 'Not found' };
    }
    if (metaRobots.includes('noindex')) {
        return { checkName: 'Meta Robots', status: SeoCheckStatus.Fail, message: `Page is set to "noindex", it will be excluded from search results.`, data: metaRobots };
    }
    if (metaRobots.includes('nofollow')) {
        return { checkName: 'Meta Robots', status: SeoCheckStatus.Warning, message: `Page is set to "nofollow", search engines won't follow links on this page.`, data: metaRobots };
    }
    return { checkName: 'Meta Robots', status: SeoCheckStatus.Pass, message: `Meta robots tag is valid.`, data: metaRobots };
};

const checkHeadingStructure = (doc: Document): SeoCheckResult => {
    const h1s = doc.querySelectorAll('h1');
    const h2s = doc.querySelectorAll('h2');
    
    if (h1s.length !== 1) {
        return { checkName: 'Heading Structure', status: SeoCheckStatus.Fail, message: `Found ${h1s.length} H1 tags. Exactly one is required.` };
    }

    if (h2s.length === 0 && doc.body.textContent && doc.body.textContent.length > 1500) {
        return { checkName: 'Heading Structure', status: SeoCheckStatus.Warning, message: 'No H2 tags were found on a lengthy page. Use H2s to break up content.' };
    }

    return { checkName: 'Heading Structure', status: SeoCheckStatus.Pass, message: 'A proper H1 tag and H2 tags are in use.' };
};

const checkLinkingProfile = (doc: Document, finalUrl: string): SeoCheckResult => {
    const links = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const baseHostname = new URL(finalUrl).hostname;
    
    let internalLinks = 0;
    let externalLinks = 0;
    let nofollowLinks = 0;
    
    const uniqueHrefs = new Set<string>();

    links.forEach(link => {
        const href = link.href;
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || uniqueHrefs.has(href)) {
            return;
        }
        uniqueHrefs.add(href);

        if (link.rel.includes('nofollow')) {
            nofollowLinks++;
        }
        
        try {
            const linkHostname = new URL(href).hostname;
            if (linkHostname === baseHostname) {
                internalLinks++;
            } else {
                externalLinks++;
            }
        } catch (e) {
            // Invalid URL, ignore
        }
    });

    const data = {
        internalLinks,
        externalLinks,
        nofollowLinks,
        totalUniqueLinks: uniqueHrefs.size
    };

    if (internalLinks === 0 && externalLinks === 0) {
        return { checkName: 'Linking Profile', status: SeoCheckStatus.Warning, message: 'No unique internal or external links found.', data };
    }
    
    if (externalLinks === 0) {
        return { checkName: 'Linking Profile', status: SeoCheckStatus.Warning, message: 'No external links found. Linking to authoritative sources can improve trust.', data };
    }

    return { checkName: 'Linking Profile', status: SeoCheckStatus.Pass, message: 'A healthy mix of internal and external links was found.', data };
};


// --- Scoring Logic ---

const SEO_WEIGHTS: Record<string, number> = {
    'Meta Title': 15,
    'Meta Description': 10,
    'H1 Tag': 15,
    'Canonical Tag': 10,
    'Meta Robots': 10,
    'Image Alt Text': 10,
    'Schema Markup': 5,
    'Open Graph Tags': 5,
    'Heading Structure': 10,
    'Linking Profile': 10,
};

const GEO_WEIGHTS: Record<string, number> = {
    'Meta Title': 10,
    'Meta Description': 10,
    'H1 Tag': 10,
    'Schema Markup': 25,
    'Heading Structure': 20,
    'Linking Profile': 15,
    'Open Graph Tags': 10,
};

const STATUS_MULTIPLIERS = {
    [SeoCheckStatus.Pass]: 1,
    [SeoCheckStatus.Warning]: 0.5,
    [SeoCheckStatus.Fail]: 0,
};

const calculateScores = (checks: SeoCheckResult[]): { seoScore: number, geoScore: number } => {
    let seoScore = 0;
    let totalSeoWeight = 0;
    let geoScore = 0;
    let totalGeoWeight = 0;

    for (const check of checks) {
        const multiplier = STATUS_MULTIPLIERS[check.status] ?? 0;
        
        if (SEO_WEIGHTS[check.checkName]) {
            const weight = SEO_WEIGHTS[check.checkName];
            seoScore += weight * multiplier;
            totalSeoWeight += weight;
        }

        if (GEO_WEIGHTS[check.checkName]) {
            const weight = GEO_WEIGHTS[check.checkName];
            geoScore += weight * multiplier;
            totalGeoWeight += weight;
        }
    }

    const finalSeoScore = totalSeoWeight > 0 ? (seoScore / totalSeoWeight) * 100 : 0;
    const finalGeoScore = totalGeoWeight > 0 ? (geoScore / totalGeoWeight) * 100 : 0;

    return { 
        seoScore: Math.round(finalSeoScore),
        geoScore: Math.round(finalGeoScore),
    };
};


// --- Core Auditing and Crawling Logic ---

const auditSingleUrl = async (initialUrl: string, context: { allSitemapUrls?: Set<string> | null } = {}, signal?: AbortSignal): Promise<UrlAuditReport> => {
  try {
    let response: Response | null = null;
    let lastError: Error | null = null;
    const MAX_ATTEMPTS = 2;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(initialUrl)}`, { signal });
            if (response.ok) {
                break; // Success, exit loop
            }
            lastError = new Error(`CORS proxy request failed. Status: ${response.status}`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
        
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    
    if (!response || !response.ok) {
        throw lastError || new Error('All fetch attempts failed.');
    }
    
    const data: AllOriginsResponse = await response.json();
    const html = data.contents;
    const finalUrl = data.status.url;
    const statusCode = data.status.http_code;
    
    if (!html || statusCode === 0 || statusCode >= 400) {
        let errorMsg = 'Failed to fetch page content.';
        if (statusCode >= 400) {
            errorMsg = `Page returned a client or server error (Status: ${statusCode}).`;
        } else if (statusCode === 0) {
             errorMsg = 'The URL may be invalid or the site is blocking requests from the proxy.';
        }
        throw new Error(errorMsg);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let base = doc.querySelector('base');
    if (!base) {
        base = doc.createElement('base');
        doc.head.prepend(base);
    }
    base.href = finalUrl;

    const seoChecks: SeoCheckResult[] = [
      checkMetaTitle(doc),
      checkMetaDescription(doc),
      checkH1Tag(doc),
      checkCanonicalTag(doc),
      checkMetaRobots(doc),
      checkImageAltText(doc),
      checkSchemaMarkup(doc),
      checkOpenGraphTags(doc),
      checkHeadingStructure(doc),
      checkLinkingProfile(doc, finalUrl),
    ];
    
    const desiredOrder = [
        'Meta Title',
        'Meta Description',
        'H1 Tag',
        'Heading Structure',
        'Canonical Tag',
        'Meta Robots',
        'Image Alt Text',
        'Linking Profile',
        'Schema Markup',
        'Open Graph Tags'
    ];

    const orderedChecks = seoChecks.sort((a, b) => {
        const indexA = desiredOrder.indexOf(a.checkName);
        const indexB = desiredOrder.indexOf(b.checkName);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
    
    const { seoScore, geoScore } = calculateScores(orderedChecks);

    return { id: initialUrl, url: finalUrl, seoChecks: orderedChecks, seoScore, geoScore };

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // Re-throw abort errors to be handled by the caller
    }
    
    let detailedMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    let summaryMessage = 'Failed to fetch page content via proxy.';
    
    if (detailedMessage.includes('Failed to fetch') || detailedMessage.includes('All fetch attempts failed')) {
        summaryMessage = 'The request to the CORS proxy failed.';
        detailedMessage = 'This is often caused by:\n' +
                  '1. The third-party proxy service being temporarily unavailable.\n' +
                  '2. A browser extension (like an ad-blocker) blocking the request.\n' +
                  '3. A network firewall or security policy.\n\n' +
                  'Please try again later or check your browser/network configuration.';
    }

    return {
      id: initialUrl,
      url: initialUrl,
      seoChecks: [{ 
          checkName: 'Page Fetch', 
          status: SeoCheckStatus.Fail, 
          message: summaryMessage,
          data: detailedMessage
      }],
      seoScore: 0,
      geoScore: 0,
    };
  }
};

// FIX: Add missing auditUrlList function
export const auditUrlList = async (
    urls: string[],
    setProgress: (message: string) => void,
    context: { sitemapUrl?: string },
    signal?: AbortSignal
): Promise<UrlAuditReport[]> => {
    const urlsToAudit = urls.slice(0, MAX_PAGES_TO_AUDIT);
    const totalUrls = urlsToAudit.length;

    const auditPromises = urlsToAudit.map((url, index) => {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        setProgress(`Auditing page ${index + 1} of ${totalUrls}: ${url}`);
        return auditSingleUrl(url, {}, signal);
    });

    return Promise.all(auditPromises);
};

// FIX: Add missing crawlAndAuditSite function
export const crawlAndAuditSite = async (
    startUrl: string,
    setProgress: (message: string) => void,
    signal?: AbortSignal
): Promise<UrlAuditReport[]> => {
    setProgress('Starting crawl from homepage...');

    const visitedUrls = new Set<string>();
    const urlsToCrawl = new Set<string>();

    // 1. Fetch homepage to get its final URL and find links
    const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(startUrl)}`, { signal });
    if (!response.ok) throw new Error(`Could not fetch homepage (status: ${response.status}).`);
    const data: AllOriginsResponse = await response.json();
    const html = data.contents;
    const finalUrl = data.status.url;

    if (!html) throw new Error('Homepage content is empty.');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let base = doc.querySelector('base');
    if (!base) {
        base = doc.createElement('base');
        doc.head.prepend(base);
    }
    base.href = finalUrl;

    const homepageHostname = new URL(finalUrl).hostname;
    visitedUrls.add(finalUrl);
    urlsToCrawl.add(finalUrl);

    // 2. Find internal links on homepage
    doc.querySelectorAll('a[href]').forEach(link => {
        if (urlsToCrawl.size >= MAX_PAGES_TO_AUDIT) return;
        const anchor = link as HTMLAnchorElement;
        const href = anchor.href;
        try {
            const linkUrl = new URL(href);
            if (linkUrl.hostname === homepageHostname && !href.includes('#') && !visitedUrls.has(href)) {
                urlsToCrawl.add(href);
                visitedUrls.add(href);
            }
        } catch (e) {
            // ignore invalid URLs
        }
    });

    // 3. Audit all collected URLs
    const urlsToAudit = Array.from(urlsToCrawl);
    return auditUrlList(urlsToAudit, setProgress, {}, signal);
};

export const fetchAndParseSitemap = async (sitemapUrl: string, signal?: AbortSignal): Promise<SitemapParseResult> => {
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        try {
            const xmlText = await fetchContentWithFallback(sitemapUrl, signal);

            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlText, "application/xml");
            
            const parserError = doc.querySelector("parsererror");
            if (parserError) {
                throw new Error("Failed to parse sitemap. The document is not valid XML.");
            }
            
            // FIX: Complete the truncated function to handle sitemap logic and return a value.
            const isSitemapIndex = doc.documentElement.tagName.toLowerCase() === 'sitemapindex';
            
            if (isSitemapIndex) {
                const sitemapUrls = Array.from(doc.querySelectorAll('sitemap > loc'))
                    .map(loc => loc.textContent?.trim())
                    .filter((url): url is string => !!url);
                return { type: 'index', urls: sitemapUrls };
            }

            const pageUrls = Array.from(doc.querySelectorAll('url > loc'))
                .map(loc => loc.textContent?.trim())
                .filter((url): url is string => !!url);
                
            if (pageUrls.length === 0 && !isSitemapIndex) {
                throw new Error("Sitemap appears to be a URL set but contains no URLs.");
            }

            return { type: 'urlset', urls: pageUrls };

        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (attempt < MAX_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            }
        }
    }
    
    throw new Error(`Failed to fetch and parse sitemap after ${MAX_ATTEMPTS} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
};
