import React, { useEffect, useCallback, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { ONBOARDING_STEPS, markOnboardingDone } from '../onboardingSteps';
import { WhatsAppQrPanel } from '../../settings/ui/WhatsAppQrPanel';

function useSpotlightRect(targetId, open, stepIndex) {
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setRect({
      top: Math.max(8, r.top - pad),
      left: Math.max(8, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [targetId]);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, stepIndex, measure]);

  return rect;
}

export function OnboardingTour({
  open,
  stepIndex,
  setStepIndex,
  onClose,
  onNavigate,
  userId,
  onOpenSidebar,
}) {
  const total = ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[stepIndex] || ONBOARDING_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;
  const isIntro = step.phase === 'intro';
  const isOutro = step.phase === 'outro';
  const progress = ((stepIndex + 1) / total) * 100;
  const cardRef = useRef(null);
  const spotlight = useSpotlightRect(step.target, open, stepIndex);
  const Icon = step.icon;

  useEffect(() => {
    if (!open || !step?.tab || !onNavigate) return;
    onNavigate(step.tab);
    if (step.target && step.target !== 'ai-bot' && onOpenSidebar) {
      onOpenSidebar(true);
    }
  }, [open, stepIndex, step?.tab, step?.target, onNavigate, onOpenSidebar]);

  const finish = useCallback(() => {
    markOnboardingDone(userId);
    onClose();
    if (onOpenSidebar) onOpenSidebar(false);
  }, [userId, onClose, onOpenSidebar]);

  const goNext = useCallback(() => {
    if (isLast) finish();
    else setStepIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, finish, setStepIndex, total]);

  const goPrev = useCallback(() => {
    if (!isFirst) setStepIndex((i) => Math.max(i - 1, 0));
  }, [isFirst, setStepIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goPrev]);

  if (!open) return null;

  const cardPositionClass = spotlight && typeof window !== 'undefined' && window.innerWidth >= 768
    ? 'sm:items-center sm:justify-end sm:pr-8 sm:pl-[min(20rem,28vw)]'
    : 'sm:items-center sm:justify-center';

  return (
    <div className={`fixed inset-0 z-[90] flex items-end ${cardPositionClass} p-0 sm:p-4 pointer-events-none`}>
      {/* Dim + spotlight hole */}
      <div className="absolute inset-0 pointer-events-auto" aria-hidden>
        {spotlight ? (
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="onboarding-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlight.left}
                  y={spotlight.top}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx="14"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(2, 6, 23, 0.62)"
              mask="url(#onboarding-spotlight-mask)"
              onClick={finish}
              style={{ cursor: 'pointer' }}
            />
            <rect
              x={spotlight.left}
              y={spotlight.top}
              width={spotlight.width}
              height={spotlight.height}
              rx="14"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              className="animate-pulse"
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        ) : (
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
            onClick={finish}
          />
        )}
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative pointer-events-auto w-full sm:max-w-md mb-0 rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden animate-slide-up safe-area-bottom"
      >
        {/* Gradient header strip */}
        <div className={`h-1.5 bg-gradient-to-r ${step.accent || 'from-blue-600 to-indigo-600'}`} />
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg bg-gradient-to-br ${step.accent || 'from-blue-600 to-indigo-600'}`}
              >
                {Icon ? <Icon size={22} strokeWidth={2.2} /> : null}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isIntro ? 'Bienvenida' : isOutro ? 'Listo' : `Paso ${stepIndex} de ${total - 2}`}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {step.subtitle}
                </p>
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
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 leading-snug"
          >
            {step.title}
          </h2>
          <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 mb-4">
            {step.body}
          </p>

          {Array.isArray(step.bullets) && step.bullets.length > 0 && (
            <ul className="space-y-2 mb-4">
              {step.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                >
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {step.tip && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/80 mb-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Tip · </span>
              {step.tip}
            </p>
          )}

          {step.showWhatsAppQr && (
            <div className="mt-4 max-h-[50vh] overflow-y-auto overscroll-contain rounded-2xl">
              <WhatsAppQrPanel compact autoFetch />
            </div>
          )}

          {/* Segment progress */}
          <div className="flex gap-1 mt-5 mb-1">
            {ONBOARDING_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(i)}
                className={`h-1 flex-1 rounded-full transition-all touch-manipulation ${
                  i <= stepIndex ? 'opacity-100' : 'opacity-25'
                }`}
                style={{ backgroundColor: 'var(--color-primary)' }}
                aria-label={`Ir a: ${s.title}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5">
            {!isIntro && (
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none min-h-[44px] touch-manipulation"
              >
                <ChevronLeft size={18} />
                Atrás
              </button>
            )}

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
              className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg min-h-[44px] active:scale-[0.98] touch-manipulation bg-gradient-to-r ${step.accent || 'from-blue-600 to-indigo-600'}`}
            >
              {step.cta || (isLast ? 'Empezar' : 'Siguiente')}
              {!isLast && !step.cta && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
