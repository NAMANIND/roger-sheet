'use client';

import { cn } from '@/lib/utils';
import {
  extractBracePlaceholders,
  extractScriptDataRefs,
} from '@/lib/params';

type HighlightMode = 'brace' | 'script';

interface TemplateHighlightProps {
  text: string;
  definedParams: string[];
  mode?: HighlightMode;
  className?: string;
  emptyLabel?: string;
}

function renderBraceSegments(text: string, definedSet: Set<string>) {
  const parts = text.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{(\w+)\}$/);
    if (!match) {
      return (
        <span key={i} className="text-muted-foreground whitespace-pre-wrap break-all">
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
          'font-mono font-medium px-0.5 rounded',
          ok
            ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
            : 'bg-destructive/15 text-destructive ring-1 ring-destructive/30'
        )}
        title={ok ? `Parameter: ${name}` : `Unknown — add "${name}" in Parameters first`}
      >
        {part}
      </span>
    );
  });
}

function renderScriptSegments(text: string, definedSet: Set<string>) {
  const parts = text.split(/(data\.\w+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^data\.(\w+)$/);
    if (!match) {
      return (
        <span key={i} className="text-muted-foreground whitespace-pre-wrap break-all">
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
          'font-mono font-medium px-0.5 rounded',
          ok
            ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
            : 'bg-destructive/15 text-destructive ring-1 ring-destructive/30'
        )}
        title={ok ? `Parameter: ${name}` : `Unknown — add "${name}" in Parameters first`}
      >
        {part}
      </span>
    );
  });
}

export function TemplateHighlight({
  text,
  definedParams,
  mode = 'brace',
  className,
  emptyLabel = 'Preview will appear here…',
}: TemplateHighlightProps) {
  const definedSet = new Set(definedParams);

  if (!text.trim()) {
    return (
      <p className={cn('text-xs text-muted-foreground italic', className)}>{emptyLabel}</p>
    );
  }

  return (
    <div
      className={cn(
        'text-xs font-mono leading-relaxed p-2.5 rounded-md bg-muted/60 border border-border min-h-[2rem]',
        className
      )}
    >
      {mode === 'script'
        ? renderScriptSegments(text, definedSet)
        : renderBraceSegments(text, definedSet)}
    </div>
  );
}

interface ParamUsageSummaryProps {
  definedParams: string[];
  usedRefs: string[];
  mode: 'brace' | 'script';
}

export function ParamUsageSummary({
  definedParams,
  usedRefs,
  mode,
}: ParamUsageSummaryProps) {
  const definedSet = new Set(definedParams);
  const unknown = usedRefs.filter((p) => !definedSet.has(p));
  const unused = definedParams.filter((p) => !usedRefs.includes(p));

  if (unknown.length === 0 && unused.length === 0 && definedParams.length === 0) {
    return null;
  }

  return (
    <div className="text-xs space-y-1">
      {unknown.length > 0 && (
        <p className="text-destructive">
          Not defined in Parameters:{' '}
          <span className="font-mono font-medium">
            {unknown.map((p) => (mode === 'script' ? `data.${p}` : `{${p}}`)).join(', ')}
          </span>
        </p>
      )}
      {unused.length > 0 && (
        <p className="text-muted-foreground">
          Defined but not used (optional):{' '}
          <span className="font-mono">{unused.join(', ')}</span>
        </p>
      )}
    </div>
  );
}

export function getUsedRefsFromText(text: string, mode: HighlightMode): string[] {
  return mode === 'script' ? extractScriptDataRefs(text) : extractBracePlaceholders(text);
}
