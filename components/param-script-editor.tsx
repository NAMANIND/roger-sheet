'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ParamScriptEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  definedParams: string[];
  rows?: number;
  className?: string;
  placeholder?: string;
}

function highlightScriptCode(text: string, definedParams: string[]) {
  const definedSet = new Set(definedParams);
  const parts = text.split(/(data\.\w+)/g);

  return parts.map((part, i) => {
    const match = part.match(/^data\.(\w+)$/);
    if (!match) {
      return (
        <span key={i} className="text-foreground">
          {part}
        </span>
      );
    }
    const name = match[1];
    const ok = definedSet.has(name);
    return (
      <span
        key={i}
        className={cn(
          'font-semibold rounded-sm px-0.5',
          ok
            ? 'bg-primary/20 text-primary'
            : 'bg-destructive/20 text-destructive underline decoration-destructive/50'
        )}
      >
        {part}
      </span>
    );
  });
}

/** Textarea with a synced highlight layer — params show inline as you type */
export function ParamScriptEditor({
  id,
  value,
  onChange,
  onFocus,
  definedParams,
  rows = 16,
  className,
  placeholder,
}: ParamScriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (ta && hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const editorClass =
    'w-full resize-y rounded-md border border-input bg-transparent px-3 py-2.5 text-sm font-mono leading-relaxed';

  return (
    <div
      className={cn(
        'relative rounded-md border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary/50',
        className
      )}
    >
      <div
        ref={highlightRef}
        aria-hidden
        className={cn(
          editorClass,
          'absolute inset-0 overflow-auto pointer-events-none border-0 rounded-none m-0 whitespace-pre-wrap break-words'
        )}
        style={{ minHeight: `${rows * 1.5}rem` }}
      >
        {value ? (
          highlightScriptCode(value, definedParams)
        ) : (
          <span className="text-muted-foreground/60">{placeholder}</span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onScroll={syncScroll}
        rows={rows}
        spellCheck={false}
        placeholder={placeholder}
        className={cn(
          editorClass,
          'relative z-10 block text-transparent caret-foreground selection:bg-primary/25'
        )}
        style={{ minHeight: `${rows * 1.5}rem` }}
      />
    </div>
  );
}
