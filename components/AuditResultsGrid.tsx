
import React from 'react';
import type { UrlAuditReport } from '../types.js';
import AuditCard from './AuditCard.js';

interface AuditResultsGridProps {
  reports: UrlAuditReport[];
  expandedReportId: string | null;
  onExpandReport: (id: string) => void;
  onCollapse: () => void;
}

const AuditResultsGrid: React.FC<AuditResultsGridProps> = ({ reports, expandedReportId, onExpandReport, onCollapse }) => {
  const expandedReport = expandedReportId ? reports.find(r => r.id === expandedReportId) : null;

  if (expandedReport) {
    return (
      <div>
        <button 
          onClick={onCollapse} 
          className="mb-6 bg-white hover:bg-gray-100 text-moss-green font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center gap-2 border border-ash-gray-light/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Back to All Cards
        </button>
        <AuditCard report={expandedReport} isExpanded={true} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <AuditCard 
          key={report.id} 
          report={report} 
          isExpanded={false} 
          onExpand={() => onExpandReport(report.id)} 
        />
      ))}
    </div>
  );
};

export default AuditResultsGrid;