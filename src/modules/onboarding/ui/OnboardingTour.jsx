import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Compass, Sparkles } from 'lucide-react';
import { ONBOARDING_STEPS, markOnboardingDone } from './onboardingSteps';

export function OnboardingTour({ open, stepIndex, setStepIndex, onClose, onNavigate, userId }) {
  const total = ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[stepIndex] || ONBOARDING_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;
  const progress = ((stepIndex + 1) / total) * 100;

  useEffect(() => {
    if (!open || !step?.tab || !onNavigate) return;
    onNavigate(step.tab);
  }, [open, stepIndex, step?.tab, onNavigate]);

  const finish = useCallback(() => {
    markOnboardingDone(userId);
    onClose();
  }, [userId, onClose]);

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => Math.min(i + 1, total - 1));
  };

  const goPrev = () => {
    if (!isFirst) setStepIndex((i) => Math.max(i - 1, 0));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      {/* Soft veil — still allows seeing the app behind */}
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] pointer-events-auto"
        onClick={finish}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative pointer-events-auto w-full sm:max-w-lg mb-0 sm:mb-0 rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up safe-area-bottom"
      >
        {/* Progress */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isLast ? <Sparkles size={20} /> : <Compass size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Guía · {stepIndex + 1} de {total}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{step.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={finish}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Cerrar guía"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            id="onboarding-title"
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2"
          >
            {step.title}
          </h2>
          <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 mb-3">
            {step.body}
          </p>
          {step.tip && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/80">
              {step.tip}
            </p>
          )}

          {/* Step dots */}
          <div className="flex flex-wrap gap-1.5 mt-5 mb-1">
            {ONBOARDING_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(i)}
                className={`h-1.5 rounded-full transition-all touch-manipulation bg-slate-200 dark:bg-slate-700 ${
                  i === stepIndex ? 'w-6' : 'w-1.5 opacity-50 hover:opacity-80'
                }`}
                style={i <= stepIndex ? { backgroundColor: 'var(--color-primary)' } : undefined}
                aria-label={`Paso ${i + 1}: ${s.title}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none min-h-[44px] touch-manipulation"
            >
              <ChevronLeft size={18} />
              Atrás
            </button>

            <button
              type="button"
              onClick={finish}
              className="ml-auto text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 min-h-[44px] touch-manipulation"
            >
              Saltar
            </button>

            <button
              type="button"
              onClick={goNext}
              style={{ backgroundColor: 'var(--color-primary)' }}
              className="flex items-center justify-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg min-h-[44px] active:scale-[0.98] touch-manipulation"
            >
              {isLast ? 'Empezar' : 'Siguiente'}
              {!isLast && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
