
import React, { useState, useMemo } from 'react';

const MAX_PAGES_TO_AUDIT = 12;

interface SitemapUrlSelectorProps {
  urls: string[];
  selectedUrls: string[];
  onSelectionChange: (selected: string[]) => void;
}

const SitemapUrlSelector: React.FC<SitemapUrlSelectorProps> = ({ urls, selectedUrls, onSelectionChange }) => {
  const [filter, setFilter] = useState('');

  const handleCheckboxChange = (url: string, isChecked: boolean) => {
    if (isChecked) {
      if (selectedUrls.length < MAX_PAGES_TO_AUDIT) {
        onSelectionChange([...selectedUrls, url]);
      }
    } else {
      onSelectionChange(selectedUrls.filter(u => u !== url));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      onSelectionChange(filteredUrls.slice(0, MAX_PAGES_TO_AUDIT));
    } else {
      onSelectionChange([]);
    }
  };

  const filteredUrls = useMemo(() => {
    return urls.filter(url => url.toLowerCase().includes(filter.toLowerCase()));
  }, [urls, filter]);

  const isAllSelected = useMemo(() => {
    const filteredSet = new Set(filteredUrls);
    const selectedInFiltered = selectedUrls.filter(url => filteredSet.has(url));
    return selectedInFiltered.length > 0 && selectedInFiltered.length === Math.min(filteredUrls.length, MAX_PAGES_TO_AUDIT);
  }, [selectedUrls, filteredUrls]);

  const canSelectMore = selectedUrls.length < MAX_PAGES_TO_AUDIT;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <input
            type="text"
            placeholder="Filter URLs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white text-moss-green placeholder-ash-gray rounded-md px-3 py-2 border border-ash-gray-light/50 focus:outline-none focus:ring-2 focus:ring-saffron"
        />
        <div className="flex items-center gap-4">
            <span className="text-ash-gray font-bold">{selectedUrls.length} / {MAX_PAGES_TO_AUDIT} selected</span>
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="select-all"
                    className="h-4 w-4 rounded border-gray-300 text-saffron focus:ring-saffron bg-ash-gray/20"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <label htmlFor="select-all" className="ml-2 block text-sm text-moss-green">
                    Select All Visible
                </label>
            </div>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto bg-alabaster border border-ash-gray-light/50 rounded-md p-4 space-y-3">
        {filteredUrls.map(url => {
          const isChecked = selectedUrls.includes(url);
          return (
            <div key={url} className="flex items-center">
              <input
                id={url}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-saffron focus:ring-saffron bg-ash-gray/20 disabled:opacity-50"
                checked={isChecked}
                disabled={!isChecked && !canSelectMore}
                onChange={(e) => handleCheckboxChange(url, e.target.checked)}
              />
              <label htmlFor={url} className="ml-3 block text-sm font-medium text-moss-green break-words" title={url}>
                {url}
              </label>
            </div>
          );
        })}
        {filteredUrls.length === 0 && (
            <p className="text-ash-gray text-center">No URLs match your filter.</p>
        )}
      </div>
    </div>
  );
};

export default SitemapUrlSelector;