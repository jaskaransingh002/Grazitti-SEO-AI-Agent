import React, { useState, useMemo } from 'react';
import type { UrlAuditReport } from '../types.js';
import { SeoCheckStatus } from '../types.js';
import SeoCheckItem from './SeoCheckItem.js';
import { SparklesIcon } from './icons.js';
import InteractiveAiAssistant from './InteractiveAiAssistant.js';
import ScoreDisplay from './ScoreDisplay.js';

interface AuditCardProps {
  report: UrlAuditReport;
  isExpanded: boolean;
  onExpand?: () => void;
}

const AuditCard: React.FC<AuditCardProps> = ({ report, isExpanded, onExpand }) => {
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);

  const summary = useMemo(() => {
    const passCount = report.seoChecks.filter(c => c.status === SeoCheckStatus.Pass).length;
    const warningCount = report.seoChecks.filter(c => c.status === SeoCheckStatus.Warning).length;
    const failCount = report.seoChecks.filter(c => c.status === SeoCheckStatus.Fail).length;
    return { passCount, warningCount, failCount };
  }, [report.seoChecks]);
  
  const seoTooltipText = "Meta Title, H1 Tag, Meta Description, Canonical Tag, Meta Robots, Image Alt Text, Heading Structure, Linking Profile, Schema Markup, Open Graph Tags";
  const geoTooltipText = "Schema Markup, Heading Structure, Linking Profile";

  return (
    <div className={`bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300 border border-ash-gray-light/20`}>
      <div className="p-5">
        <h3 className="font-bold text-lg text-moss-green break-words mb-4" title={report.url}>{report.url}</h3>
        
        <div className="flex justify-around items-center gap-4 py-4 border-y border-ash-gray-light/30">
          <ScoreDisplay score={report.seoScore} label="SEO Score" tooltip={seoTooltipText} />
          <ScoreDisplay score={report.geoScore} label="GEO Score" tooltip={geoTooltipText} />
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                {summary.passCount} Passed
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.008a1 1 0 011 1v3.008a1 1 0 01-1 1h-.008a1 1 0 01-1-1V5z" clipRule="evenodd" /></svg>
                {summary.warningCount} Warnings
            </span>
             <span className="flex items-center gap-1 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {summary.failCount} Failed
            </span>
        </div>
        
        {isExpanded && (
          <>
            <div className="mt-4 pt-4 border-t border-ash-gray-light/30 grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.seoChecks.map(check => (
                <SeoCheckItem key={check.checkName} check={check} />
              ))}
            </div>
            
            {isAssistantVisible ? (
              <InteractiveAiAssistant report={report} onClose={() => setIsAssistantVisible(false)} />
            ) : (
              <div className="mt-4 pt-4 border-t border-ash-gray-light/30">
                <button 
                  onClick={() => setIsAssistantVisible(true)}
                  className="w-full bg-moss-green hover:bg-moss-green/90 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="w-5 h-5"/>
                  Chat with AI Assistant
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!isExpanded && onExpand && (
        <button 
          onClick={onExpand} 
          className="w-full bg-gray-100 hover:bg-gray-200 text-ash-gray text-sm py-2 flex items-center justify-center gap-1 transition-colors"
        >
          Show Details
        </button>
      )}
    </div>
  );
};

export default AuditCard;