import React from 'react';

/**
 * Skeleton — loading placeholder with shimmer animation.
 * Usage: <Skeleton className="h-6 w-32" /> or <Skeleton.Card />
 */
export default function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />
  );
}

/** Pre-built skeleton for a KPI card */
Skeleton.KPICard = function SkeletonKPI() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-xl" />
      </div>
    </div>
  );
};

/** Pre-built skeleton for a list row */
Skeleton.Row = function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800">
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" rounded="rounded-full" />
    </div>
  );
};

/** Dashboard loading state */
Skeleton.Dashboard = function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton.KPICard key={i} />)}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <Skeleton className="h-5 w-32" />
        {[...Array(5)].map((_, i) => <Skeleton.Row key={i} />)}
      </div>
    </div>
  );
};
