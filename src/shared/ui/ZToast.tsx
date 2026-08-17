'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

// ---------- Types ----------

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

// ---------- Context ----------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast должен использоваться внутри <ZToastContainer>');
  }
  return ctx;
}

// ---------- Variant styles ----------

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-primary text-primary-foreground',
  error: 'bg-terracotta text-white',
  info: 'bg-muted text-foreground',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={18} strokeWidth={1.5} aria-hidden="true" />,
  error: <AlertCircle size={18} strokeWidth={1.5} aria-hidden="true" />,
  info: <Info size={18} strokeWidth={1.5} aria-hidden="true" />,
};

const variantAriaLabels: Record<ToastVariant, string> = {
  success: 'Успех',
  error: 'Ошибка',
  info: 'Информация',
};

// ---------- Toast item ----------

function ZToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={clsx(
        'flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-soft-lg min-w-[260px] max-w-[360px]',
        variantStyles[toast.variant],
      )}
      role="status"
      aria-label={variantAriaLabels[toast.variant]}
    >
      {variantIcons[toast.variant]}
      <p className="flex-1 text-sm font-medium leading-snug">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Закрыть"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}

// ---------- Container ----------

export function ZToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toasts rendered in a fixed portal-like container */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ZToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
