'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronDown } from 'lucide-react';
import { useOnboardingStore } from '@/shared/lib/onboarding-store';

interface GuideSection {
  title: string;
  body: string;
}

interface FeatureGuideProps {
  /** Unique ID for this guide (used to persist dismissal) */
  guideId: string;
  /** Title of the page/feature */
  title: string;
  /** What this feature does, 1-2 sentences */
  description: string;
  /** Step-by-step instructions */
  steps: string[];
  /** Additional sections (tips, FAQ) */
  sections?: GuideSection[];
}

export function FeatureGuide({
  guideId,
  title,
  description,
  steps,
  sections,
}: FeatureGuideProps) {
  const isGuideDismissed = useOnboardingStore((s) => s.isGuideDismissed(guideId));
  const dismissGuide = useOnboardingStore((s) => s.dismissGuide);
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Don't show the dismissible banner if already dismissed
  const showBanner = !isGuideDismissed;

  return (
    <>
      {/* Help button — always visible */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed top-4 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        aria-label={open ? 'Закрыть подсказку' : 'Как пользоваться'}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={18} strokeWidth={1.5} />
            </motion.span>
          ) : (
            <motion.span
              key="help"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <HelpCircle size={18} strokeWidth={1.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Guide panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="max-lg:fixed max-lg:inset-x-0 max-lg:top-14 max-lg:bottom-0 max-lg:rounded-b-none max-lg:max-h-none fixed top-14 right-4 left-4 z-30 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft-lg"
            style={{ maxWidth: 'calc(100% - 2rem)' }}
          >
            {/* Title + description */}
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>

            {/* Steps */}
            <div className="mt-4 flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Как пользоваться
              </h4>
              {steps.map((stepText, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{stepText}</p>
                </div>
              ))}
            </div>

            {/* Additional sections (collapsible) */}
            {sections && sections.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {sections.map((sec) => {
                  const isExpanded = expandedSection === sec.title;
                  return (
                    <div key={sec.title} className="rounded-xl bg-muted/50 overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : sec.title)}
                        className="flex items-center justify-between w-full px-3.5 py-2.5 text-left"
                      >
                        <span className="text-sm font-medium text-foreground">{sec.title}</span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} strokeWidth={1.5} className="text-muted-foreground" />
                        </motion.span>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="px-3.5 pb-3 text-sm text-muted-foreground leading-relaxed">
                              {sec.body}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-show banner on first visit (collapsible tip) */}
      {showBanner && !open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-2xl bg-primary/8 border border-primary/15 p-4"
        >
          <HelpCircle size={18} strokeWidth={1.5} className="text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground leading-relaxed">
              Нажми <span className="font-semibold text-primary">? в правом верхнем углу</span>, чтобы узнать, что тут делать и зачем это нужно.
            </p>
          </div>
          <button
            onClick={() => dismissGuide(guideId)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Скрыть подсказку"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </motion.div>
      )}
    </>
  );
}
