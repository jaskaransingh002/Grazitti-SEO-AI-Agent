import React from 'react';
import { InfoIcon } from './icons.js';

interface ScoreDisplayProps {
  score: number;
  label: string;
  tooltip: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, label, tooltip }) => {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  const getScoreColor = () => {
    if (normalizedScore < 40) return 'text-red-500';
    if (normalizedScore < 70) return 'text-amber-500';
    return 'text-green-500';
  };
  
  const getTrackColor = () => {
    if (normalizedScore < 40) return 'stroke-red-200';
    if (normalizedScore < 70) return 'stroke-amber-200';
    return 'stroke-green-200';
  };
  
  const getProgressColor = () => {
    if (normalizedScore < 40) return 'stroke-red-500';
    if (normalizedScore < 70) return 'stroke-amber-500';
    return 'stroke-green-500';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className={`transition-colors duration-500 ${getTrackColor()}`}
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
          <circle
            className={`transition-all duration-1000 ease-out ${getProgressColor()}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
            transform="rotate(-90 50 50)"
            style={{ transitionProperty: 'stroke-dashoffset' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>
            {Math.round(normalizedScore)}
          </span>
        </div>
      </div>
       <div className="relative group flex items-center gap-1 mt-2">
            <span className="text-sm font-semibold text-ash-gray">{label}</span>
            <InfoIcon className="w-4 h-4 text-ash-gray-light" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 invisible group-hover:visible bg-moss-green-dark text-white text-xs rounded-md p-3 shadow-lg transition-opacity duration-300 z-10">
                <p className="font-bold mb-1 text-base">Factors Considered:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                    {tooltip.split(', ').map(item => <li key={item}>{item}</li>)}
                </ul>
                <svg className="absolute text-moss-green-dark h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                </svg>
            </div>
        </div>
    </div>
  );
};

export default ScoreDisplay;