
import React, { useState, useCallback } from 'react';
import type { UrlAuditReport, AuditMode } from './types.js';
import { crawlAndAuditSite, auditUrlList } from './services/seoService.js';
import UrlInputForm from './components/UrlInputForm.js';
import AuditResultsGrid from './components/AuditResultsGrid.js';
import OverallSummary from './components/OverallSummary.js';
import { LogoIcon } from './components/icons.js';
import Loader from './components/Loader.js';

const App: React.FC = () => {
  const [auditReports, setAuditReports] = useState<UrlAuditReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analyzedUrl, setAnalyzedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleAnalysis = useCallback(async (mode: AuditMode, data: { url?: string; urls?: string[], sitemapUrl?: string }) => {
    const controller = new AbortController();
    setAbortController(controller);

    setIsLoading(true);
    setError('');
    setProgressMessage('Starting audit...');
    setAuditReports([]);
    setExpandedReportId(null); // Reset expanded view on new analysis
    setAnalyzedUrl(data.url || (data.urls && data.urls.length > 0 ? new URL(data.urls[0]).hostname : ''));

    try {
      let reports: UrlAuditReport[];

      if (mode === 'crawl' && data.url) {
        let fullUrl = data.url;
        if (!/^https?:\/\//i.test(fullUrl)) {
          fullUrl = 'https://' + fullUrl;
        }
        setAnalyzedUrl(fullUrl);
        reports = await crawlAndAuditSite(fullUrl, setProgressMessage, controller.signal);

      } else if ((mode === 'single' && data.url) || ((mode === 'sitemap' || mode === 'custom') && data.urls)) {
        const urlsToAudit = mode === 'single' ? [data.url!] : data.urls!;
        if (urlsToAudit.length === 0) {
            throw new Error("No URLs were provided or selected for audit.");
        }
        const fullUrls = urlsToAudit.map(u => !/^https?:\/\//i.test(u) ? 'https://' + u : u);
        setAnalyzedUrl(new URL(fullUrls[0]).hostname);
        reports = await auditUrlList(fullUrls, setProgressMessage, { sitemapUrl: data.sitemapUrl }, controller.signal);
      } else {
        throw new Error("Invalid analysis request. Please select a mode and provide a URL.");
      }
      
      setAuditReports(reports);
      setProgressMessage('');

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Analysis was terminated by the user.');
          console.log('Analysis aborted by user.');
      } else {
          console.error("Audit failed:", err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred during the audit.');
      }
    } finally {
      setIsLoading(false);
      setProgressMessage('');
      setAbortController(null);
    }
  }, []);

  const handleTerminate = () => {
    if (abortController) {
      abortController.abort();
    }
  };


  return (
    <div className="min-h-screen bg-alabaster text-moss-green font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <LogoIcon className="w-16 h-16 text-moss-green" />
            <h1 className="text-5xl font-bold tracking-tight text-moss-green">
              AI SEO Agent
            </h1>
          </div>
          <p className="text-lg text-ash-gray max-w-2xl mx-auto">
            Choose an audit method below. Our AI will analyze the results and provide strategic recommendations to boost your rankings.
          </p>
        </header>

        <UrlInputForm onAnalyze={handleAnalysis} isLoading={isLoading} />
        
        {error && (
            <div className="mt-8 max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {analyzedUrl && !error && auditReports.length === 0 && !isLoading && (
            <div className="mt-8 max-w-4xl mx-auto bg-yellow-100 border border-yellow-500 text-yellow-800 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Notice: </strong>
                <span className="block sm:inline">The audit completed, but no pages were processed. This can happen if the analysis was terminated early.</span>
            </div>
        )}

        {(isLoading || auditReports.length > 0) && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6 text-moss-green">
              Audit Results for <span className="text-saffron">{analyzedUrl}</span>
            </h2>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Loader />
                <p className="mt-4 text-ash-gray text-lg">{progressMessage}</p>
                <button 
                  onClick={handleTerminate}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
                >
                  Terminate Analysis
                </button>
              </div>
            ) : (
             <>
                {auditReports.length > 0 && !expandedReportId && <OverallSummary reports={auditReports} />}
                <AuditResultsGrid 
                  reports={auditReports} 
                  expandedReportId={expandedReportId}
                  onExpandReport={setExpandedReportId}
                  onCollapse={() => setExpandedReportId(null)}
                />
             </>
            )}
          </div>
        )}
      </main>
      <footer className="text-center py-6 mt-12 border-t border-gray-300">
        <p className="text-ash-gray">Powered by Grazitti Interactive</p>
      </footer>
    </div>
  );
};

export default App;