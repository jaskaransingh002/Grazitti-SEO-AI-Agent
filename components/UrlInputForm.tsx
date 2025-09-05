
import React, { useState } from 'react';
import type { AuditMode, SitemapParseResult } from '../types.js';
import { fetchAndParseSitemap } from '../services/seoService.js';
import { GlobeIcon, SitemapIcon, DocumentIcon, ListBulletIcon, ChevronLeftIcon } from './icons.js';
import SitemapUrlSelector from './SitemapUrlSelector.js';
import Loader from './Loader.js';

const MAX_PAGES_TO_AUDIT = 12;

interface UrlInputFormProps {
  onAnalyze: (mode: AuditMode, data: { url?: string; urls?: string[]; sitemapUrl?: string }) => void;
  isLoading: boolean;
}

const modeConfig = {
    crawl: {
        icon: GlobeIcon,
        title: 'Crawl Site',
        description: 'Discover and audit pages starting from a homepage.',
        placeholder: 'Enter homepage domain (e.g., example.com)',
        buttonText: 'Analyze Site',
    },
    sitemap: {
        icon: SitemapIcon,
        title: 'Use Sitemap',
        description: 'Fetch all URLs from a sitemap.xml file and choose which to audit.',
        placeholder: 'Enter sitemap URL (e.g., example.com/sitemap.xml)',
        buttonText: 'Fetch URLs',
    },
    single: {
        icon: DocumentIcon,
        title: 'Single Page',
        description: 'Run a focused audit on one specific page URL.',
        placeholder: 'Enter a single page URL to audit',
        buttonText: 'Analyze Page',
    },
    custom: {
        icon: ListBulletIcon,
        title: 'Custom List',
        description: `Paste up to ${MAX_PAGES_TO_AUDIT} URLs to audit.`,
        placeholder: 'Enter one URL per line, or separate with commas',
        buttonText: 'Analyze URLs',
    }
};

const ModeSelector: React.FC<{ activeMode: AuditMode; onModeChange: (mode: AuditMode) => void, disabled: boolean }> = ({ activeMode, onModeChange, disabled }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 justify-center gap-4 mb-6">
        {(Object.keys(modeConfig) as AuditMode[]).map(mode => {
            const config = modeConfig[mode];
            const isActive = activeMode === mode;
            return (
                <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => onModeChange(mode)}
                    className={`
                        p-4 rounded-lg border-2 text-left transition-all duration-200 
                        ${isActive ? 'bg-white border-saffron shadow-lg' : 'bg-alabaster border-ash-gray-light/50 hover:border-ash-gray-light'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <div className="flex items-center gap-3">
                        <config.icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-saffron' : 'text-ash-gray'}`} />
                        <h3 className={`font-bold ${isActive ? 'text-moss-green' : 'text-moss-green/80'}`}>{config.title}</h3>
                    </div>
                    <p className="text-sm text-ash-gray mt-1">{config.description}</p>
                </button>
            );
        })}
    </div>
);

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onAnalyze, isLoading }) => {
  const [mode, setMode] = useState<AuditMode>('crawl');
  const [url, setUrl] = useState<string>('');
  const [urlList, setUrlList] = useState('');
  const [inputError, setInputError] = useState('');
  
  const [sitemapStack, setSitemapStack] = useState<{ url: string; data: SitemapParseResult }[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapError, setSitemapError] = useState('');

  const handleModeChange = (newMode: AuditMode) => {
    setMode(newMode);
    setUrl('');
    setUrlList('');
    setInputError('');
    setSitemapStack([]);
    setSelectedUrls([]);
    setSitemapError('');
  };

  const handleFetchSitemap = async (sitemapUrl: string, isInitial: boolean) => {
    setSitemapLoading(true);
    setSitemapError('');
    if (isInitial) {
        setSelectedUrls([]);
    }
    try {
        let fullUrl = sitemapUrl;
        if (!/^https?:\/\//i.test(fullUrl)) {
            fullUrl = 'https://' + fullUrl;
        }
        const result = await fetchAndParseSitemap(fullUrl);
        if (isInitial) {
            setSitemapStack([{ url: fullUrl, data: result }]);
        } else {
            setSitemapStack(prev => [...prev, { url: fullUrl, data: result }]);
        }
    } catch (err) {
        setSitemapError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setSitemapLoading(false);
    }
  };

  const handleSitemapBack = () => {
    setSitemapError('');
    setSitemapStack(prev => prev.slice(0, -1));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setInputError('');
    
    if (mode === 'sitemap') {
        if (!url) return;
        handleFetchSitemap(url, true);
    } else if (mode === 'custom') {
        if (!urlList.trim()) return;
        const urls = urlList
            .split(/[\n,]+/)
            .map(u => u.trim())
            .filter(Boolean)
            .slice(0, MAX_PAGES_TO_AUDIT);
        if (urls.length > 0) {
            onAnalyze('custom', { urls });
        }
    } else { // crawl or single
        if (!url.trim()) return;

        if (mode === 'crawl') {
            try {
                let tempUrl = url.trim();
                 // A simple regex to check for paths, avoiding complex TLD matching
                if (/\.[a-zA-Z]{2,}\/./.test(tempUrl.split('?')[0].split('#')[0])) {
                     setInputError('Please enter a homepage URL only (e.g., example.com) to crawl the site.');
                     return;
                }
            } catch (e) { /* Ignore invalid URL formats, let main analysis catch them */ }
        }

        onAnalyze(mode, { url });
    }
  };

  const handleAnalyzeSitemap = () => {
    if (selectedUrls.length > 0) {
        onAnalyze('sitemap', { urls: selectedUrls, sitemapUrl: sitemapStack[0]?.url });
    }
  };

  const currentConfig = modeConfig[mode];
  const currentSitemap = sitemapStack.length > 0 ? sitemapStack[sitemapStack.length - 1] : null;
  const isSitemapUIActive = mode === 'sitemap' && currentSitemap !== null;

  return (
    <div className="max-w-4xl mx-auto">
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} disabled={isLoading} />
      
      { !isSitemapUIActive && (
          <form onSubmit={handleSubmit}>
            <div className={`flex bg-white border border-ash-gray-light/50 rounded-lg p-2 shadow-lg focus-within:ring-2 focus-within:ring-saffron transition-all duration-300 ${mode === 'custom' ? 'flex-col' : 'items-center'}`}>
                {mode === 'custom' ? (
                    <textarea
                        value={urlList}
                        onChange={(e) => setUrlList(e.target.value)}
                        placeholder={currentConfig.placeholder}
                        className="w-full bg-transparent text-lg text-moss-green placeholder-ash-gray outline-none px-4 py-2 resize-y h-32"
                        disabled={isLoading}
                    />
                ) : (
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setInputError(''); }}
                        placeholder={currentConfig.placeholder}
                        className="flex-grow bg-transparent text-lg text-moss-green placeholder-ash-gray outline-none px-4 py-2"
                        disabled={isLoading || sitemapLoading}
                    />
                )}

                <button
                    type="submit"
                    className={`bg-saffron hover:bg-saffron/90 text-moss-green-dark font-bold py-2 px-6 rounded-md transition-colors duration-300 disabled:bg-ash-gray disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] ${mode === 'custom' ? 'w-full mt-2' : ''}`}
                    disabled={isLoading || sitemapLoading || (mode === 'custom' ? !urlList.trim() : !url.trim())}
                >
                    { sitemapLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : currentConfig.buttonText }
                </button>
            </div>
          </form>
      )}

      {inputError && <p className="text-red-600 mt-2 text-center font-semibold">{inputError}</p>}
      {sitemapError && <p className="text-red-500 mt-4 text-center">{sitemapError}</p>}

      {isSitemapUIActive && currentSitemap && (
        <div className="mt-6 bg-white/50 border border-ash-gray-light/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    {sitemapStack.length > 1 && (
                        <button onClick={handleSitemapBack} className="flex items-center gap-1 text-ash-gray hover:text-moss-green transition-colors p-2 -ml-2 rounded-md">
                            <ChevronLeftIcon className="w-5 h-5" />
                            Back
                        </button>
                    )}
                    <h3 className="text-xl font-bold text-moss-green truncate" title={currentSitemap.url}>
                        {currentSitemap.data.type === 'index' ? `Sitemap Index (${currentSitemap.data.urls.length})` : `Page URLs (${currentSitemap.data.urls.length})`}
                    </h3>
                </div>
            </div>
            
            <p className="text-sm text-ash-gray mb-4 truncate" title={currentSitemap.url}>Source: {currentSitemap.url}</p>

            {sitemapLoading ? <div className="flex justify-center items-center h-48"><Loader/></div> : (
                currentSitemap.data.type === 'index' ? (
                    <div className="max-h-96 overflow-y-auto bg-alabaster border border-ash-gray-light/50 rounded-md p-2 space-y-2">
                        {currentSitemap.data.urls.map(childUrl => (
                            <button key={childUrl} onClick={() => handleFetchSitemap(childUrl, false)} className="w-full text-left p-3 rounded-md bg-white hover:bg-white/80 transition-colors">
                                <p className="text-moss-green font-medium truncate">{childUrl}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <SitemapUrlSelector urls={currentSitemap.data.urls} selectedUrls={selectedUrls} onSelectionChange={setSelectedUrls} />
                )
            )}
            
            {currentSitemap.data.type === 'urlset' && !sitemapLoading && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleAnalyzeSitemap}
                        className="bg-moss-green hover:bg-moss-green/90 text-white font-bold py-3 px-8 rounded-md transition-colors duration-300 disabled:bg-ash-gray disabled:cursor-not-allowed flex items-center justify-center"
                        disabled={isLoading || selectedUrls.length === 0}
                    >
                       {isLoading ? 'Analyzing...' : `Analyze ${selectedUrls.length} Selected Pages`}
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default UrlInputForm;