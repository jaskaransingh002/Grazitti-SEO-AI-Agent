import React from 'react';
import type { SeoCheckResult } from '../types.js';
import { SeoCheckStatus } from '../types.js';
import { CheckCircleIcon, ExclamationIcon, XCircleIcon } from './icons.js';

interface SeoCheckItemProps {
  check: SeoCheckResult;
}

const statusConfig = {
  [SeoCheckStatus.Pass]: {
    Icon: CheckCircleIcon,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    titleColor: 'text-green-800',
    dataBgColor: 'bg-green-100/50',
  },
  [SeoCheckStatus.Warning]: {
    Icon: ExclamationIcon,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    titleColor: 'text-yellow-800',
    dataBgColor: 'bg-yellow-100/50',
  },
  [SeoCheckStatus.Fail]: {
    Icon: XCircleIcon,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    titleColor: 'text-red-800',
    dataBgColor: 'bg-red-100/50',
  },
};

const SeoCheckItem: React.FC<SeoCheckItemProps> = ({ check }) => {
  const config = statusConfig[check.status];

  const renderData = (data: SeoCheckResult['data']) => {
    if (!data) return null;
    
    let content;
    
    if (typeof data === 'string') {
        const isJson = data.trim().startsWith('{') || data.trim().startsWith('[');
        const isHtml = data.trim().startsWith('<');
        if (isJson || isHtml) {
             content = <pre className="whitespace-pre-wrap break-all">{data}</pre>;
        } else {
             content = <p className="whitespace-pre-wrap break-words">{data}</p>;
        }
    } else if (Array.isArray(data)) {
        if (data.length === 0) return null;
        content = (
            <ul className="list-disc list-outside pl-4 space-y-1">
                {data.map((item, index) => <li key={index} className="break-words" title={item}>{item}</li>)}
            </ul>
        );
    } else if (typeof data === 'object' && data !== null) {
        const renderObject = (obj: Record<string, any>) => {
            return Object.entries(obj).map(([key, value]) => {
                // Special handling for the sampleAnchors array
                if (key === 'sampleAnchors' && Array.isArray(value) && value.length > 0) {
                    return (
                        <li key={key}>
                            <strong className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                            <ul className="list-none pl-2 mt-1 space-y-2">
                                {value.map((anchor: any, index: number) => (
                                    <li key={index} className="text-xs border-l-2 border-ash-gray-light/50 pl-2">
                                        <div className="font-medium">
                                            <span className={`font-bold ${anchor.isInternal ? 'text-moss-green' : 'text-orange-600'}`}>{anchor.isInternal ? 'Internal' : 'External'}</span>
                                            <span className="text-ash-gray"> ({anchor.type})</span>
                                        </div>
                                        <div className="truncate">
                                            <span className="text-ash-gray/80">Text: "{anchor.text}"</span>
                                        </div>
                                        <div className="text-ash-gray truncate">
                                            <span className="italic">Href: {anchor.href}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    )
                }
                // Default rendering for other object properties
                return (
                    <li key={key}>
                        <strong className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(value)}
                    </li>
                )
            })
        }
        content = (
            <ul className="list-disc list-outside pl-4 space-y-1">
                {renderObject(data)}
            </ul>
        );
    } else {
        return null;
    }

    return (
      <div className={`mt-2 p-2 rounded-md text-xs font-mono text-ash-gray ${config.dataBgColor}`}>
        {content}
      </div>
    );
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start text-sm">
        <config.Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold ${config.titleColor}`}>{check.checkName}</h4>
          <p className="text-ash-gray mt-1">{check.message}</p>
          {renderData(check.data)}
        </div>
      </div>
    </div>
  );
};

export default SeoCheckItem;