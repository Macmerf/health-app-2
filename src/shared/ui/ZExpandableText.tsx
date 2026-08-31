'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

export interface ZExpandableTextProps {
  /** Полный текст */
  text: string;
  /** Сколько строк показывать в свёрнутом виде (по умолчанию 2) */
  lines?: number;
  /** Дополнительные классы обёртки */
  className?: string;
  /** Классы самого текста (размер/цвет), напр. 'text-sm text-foreground' */
  textClassName?: string;
  /** Скрыть кнопку раскрытия (останется только тултип) */
  noToggle?: boolean;
}

/**
 * Текст с обрезкой по числу строк.
 * - Свёрнут: тултип с полным текстом при наведении (десктоп).
 * - Обрезан: кнопка «Показать полностью» / «Свернуть» — работает и на мобильном.
 */
export function ZExpandableText({
  text,
  lines = 2,
  className,
  textClassName,
  noToggle = false,
}: ZExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Определяем, обрезался ли текст (только в свёрнутом состоянии)
  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    const update = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [expanded, text, lines]);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const showToggle = !noToggle && isTruncated;

  return (
    <div className={clsx('flex flex-col', className)}>
      <p
        ref={ref}
        title={!expanded && isTruncated ? text : undefined}
        className={clsx(textClassName, 'break-words')}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {text}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={toggle}
          className="mt-1 inline-flex items-center gap-0.5 self-start text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} strokeWidth={2} />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown size={14} strokeWidth={2} />
              Показать полностью
            </>
          )}
        </button>
      )}
    </div>
  );
}
