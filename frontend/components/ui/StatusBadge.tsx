import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();
  
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  if (normalized === 'approved') {
    bg = 'bg-green-50 text-green-700 border-green-200';
  } else if (normalized === 'publishing') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
  } else if (normalized === 'published') {
    bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (normalized === 'failed') {
    bg = 'bg-red-50 text-red-700 border-red-200';
  } else if (normalized === 'review') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      {status.toUpperCase()}
    </span>
  );
};
