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

/** Table loading state */
Skeleton.Table = function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className={`h-4 flex-1 ${j === 0 ? 'max-w-[120px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Form loading state */
Skeleton.Form = function SkeletonForm({ fields = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-5 animate-fade-in">
      <Skeleton className="h-6 w-48" />
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" rounded="rounded-xl" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-28" rounded="rounded-xl" />
        <Skeleton className="h-10 w-20" rounded="rounded-xl" />
      </div>
    </div>
  );
};

/** Detail page loading state */
Skeleton.Detail = function SkeletonDetail() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 flex-shrink-0" rounded="rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" rounded="rounded-full" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <Skeleton className="h-5 w-32" />
        {[...Array(4)].map((_, i) => <Skeleton.Row key={i} />)}
      </div>
    </div>
  );
};

/** Page loading state — generic placeholder for any module */
Skeleton.Page = function SkeletonPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28" rounded="rounded-xl" />
      </div>
      <Skeleton.Table rows={6} cols={4} />
    </div>
  );
};
