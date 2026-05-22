'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { isValidParamName, normalizeParamName } from '@/lib/params';

export interface ParamPair {
  key: string;
  value: string;
}

interface ParamFieldsEditorProps {
  pairs: ParamPair[];
  onChange: (pairs: ParamPair[]) => void;
  onInsert?: (paramName: string, format: 'brace' | 'data') => void;
}

export function ParamFieldsEditor({ pairs, onChange, onInsert }: ParamFieldsEditorProps) {
  const definedNames = pairs
    .map((p) => normalizeParamName(p.key))
    .filter((n) => n && isValidParamName(n));

  const addPair = () => onChange([...pairs, { key: '', value: '' }]);

  const removePair = (index: number) => {
    if (pairs.length <= 1) {
      onChange([{ key: '', value: '' }]);
      return;
    }
    onChange(pairs.filter((_, i) => i !== index));
  };

  const updatePair = (index: number, field: 'key' | 'value', value: string) => {
    const next = [...pairs];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div>
          <Label className="text-sm font-medium">Parameters</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Define inputs here first — like TypeScript types. Use{' '}
            <code className="text-primary">{'{name}'}</code> in HTTP or{' '}
            <code className="text-primary">data.name</code> in scripts. You do not have to use
            every parameter you define.
          </p>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-0.5">
            <span>Name</span>
            <span>Default (for tests)</span>
            <span className="w-9" />
          </div>
          {pairs.map((pair, index) => {
            const normalized = normalizeParamName(pair.key);
            const invalid =
              pair.key.trim() !== '' && (!normalized || !isValidParamName(normalized));
            return (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <div>
                  <Input
                    placeholder="email"
                    value={pair.key}
                    onChange={(e) => updatePair(index, 'key', e.target.value)}
                    className={invalid ? 'border-destructive' : ''}
                  />
                  {invalid && (
                    <p className="text-[10px] text-destructive mt-0.5">
                      Letters, numbers, underscore
                    </p>
                  )}
                </div>
                <Input
                  placeholder="test@example.com"
                  value={pair.value}
                  onChange={(e) => updatePair(index, 'value', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removePair(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addPair} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add parameter
          </Button>
        </div>

        {definedNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground w-full mb-0.5">
              Insert into config:
            </span>
            {definedNames.map((name) => (
              <span key={name} className="inline-flex gap-1">
                {onInsert && (
                  <>
                    <button
                      type="button"
                      onClick={() => onInsert(name, 'brace')}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                    >
                      {`{${name}}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => onInsert(name, 'data')}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      {`data.${name}`}
                    </button>
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
