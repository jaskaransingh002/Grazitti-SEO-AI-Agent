import React, { useState } from 'react';
import type { UrlAuditReport } from '../types.js';
import { getAiSiteSummary } from '../services/geminiService.js';
import { SparklesIcon } from './icons.js';
import Loader from './Loader.js';

interface OverallSummaryProps {
    reports: UrlAuditReport[];
}

const OverallSummary: React.FC<OverallSummaryProps> = ({ reports }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSummary = async () => {
        setIsLoading(true);
        setError('');
        try {
            const avgSeoScore = reports.reduce((acc, r) => acc + r.seoScore, 0) / reports.length;
            const avgGeoScore = reports.reduce((acc, r) => acc + r.geoScore, 0) / reports.length;

            const result = await getAiSiteSummary(reports, avgSeoScore, avgGeoScore);
            // Simple markdown parsing for lists and bold text
            const formattedResult = result
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\s*-\s/gm, '</li><li class="mb-2">')
                .replace(/^\s*\*\s/gm, '</li><li class="mb-2">')
                .replace(/^\s*\d+\.\s/gm, '</li><li class="mb-2">')
                .replace(/\n/g, '<br />');

            setSummary(`<ul class="list-disc pl-5 space-y-1">${formattedResult}</ul>`.replace('<ul><br /></li>', '<ul>'));

        } catch (err) {
            setError('Failed to get site-wide summary.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (reports.length === 0) {
        return null;
    }

    return (
        <div className="mb-8 bg-white/50 border border-moss-green/30 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="w-8 h-8 text-moss-green" />
                <h2 className="text-2xl font-bold text-moss-green">AI Site-Wide Strategic Summary</h2>
            </div>
            {summary ? (
                <div 
                    className="prose prose-lg text-ash-gray max-w-none" 
                    dangerouslySetInnerHTML={{ __html: summary }} 
                />
            ) : (
                <>
                    <p className="text-ash-gray mb-4">
                        Get a high-level strategic overview. The AI will analyze common issues, average SEO/GEO scores, and provide key priorities for the entire website.
                    </p>
                    <button
                        onClick={fetchSummary}
                        disabled={isLoading}
                        className="bg-moss-green hover:bg-moss-green/90 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300 disabled:bg-ash-gray flex items-center justify-center min-w-[180px]"
                    >
                        {isLoading ? <Loader /> : 'Generate Summary'}
                    </button>
                </>
            )}
            {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
    );
};

export default OverallSummary;